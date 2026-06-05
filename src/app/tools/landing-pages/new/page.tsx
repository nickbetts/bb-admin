"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import {
  ArrowLeft,
  Globe,
  ImageIcon,
  Loader2,
  Sparkles,
  FileText,
  Grid3X3,
  ChevronRight,
  X,
  Plus,
  Check,
  Upload,
  Zap,
} from "lucide-react";
import { AnalyticsConfigForm } from "@/components/landing-pages/AnalyticsConfigForm";
import type { LpAnalyticsConfig } from "@/lib/lp-analytics";
import { CRO_ELEMENTS, CRO_CATEGORY_LABELS, type CroCategory } from "@/lib/lp-cro-elements";

interface Client {
  id: string;
  name: string;
  website?: string | null;
  defaultAnalyticsConfig?: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
}

const CAMPAIGN_TYPES = [
  {
    value: "lead-gen",
    label: "Lead Generation",
    description: "Capture leads with a form-focused page",
  },
  {
    value: "event",
    label: "Event / Campaign",
    description: "Promote an event, offer, or seasonal campaign",
  },
  {
    value: "product-launch",
    label: "Product Launch",
    description: "Showcase a new product or service",
  },
  {
    value: "service",
    label: "Service Landing",
    description: "Convert visitors for a specific service",
  },
  { value: "ecommerce", label: "E-commerce", description: "Drive product sales and conversions" },
];

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 6,
};

export default function NewLandingPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedLpId, setGeneratedLpId] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [campaignType, setCampaignType] = useState("lead-gen");
  const [targetOffering, setTargetOffering] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [suggestedAudiences, setSuggestedAudiences] = useState<
    { name: string; description: string }[]
  >([]);
  const [suggestingAudiences, setSuggestingAudiences] = useState(false);
  const [audienceSuggestError, setAudienceSuggestError] = useState<string | null>(null);
  const [requestedComponentIds, setRequestedComponentIds] = useState<string[]>([]);
  const [componentsExpanded, setComponentsExpanded] = useState(false);

  // Tracking & conversions
  const [analyticsConfig, setAnalyticsConfig] = useState<LpAnalyticsConfig>({});
  const [inheritedAnalytics, setInheritedAnalytics] = useState<LpAnalyticsConfig | undefined>(
    undefined,
  );
  const [saveAsClientDefault, setSaveAsClientDefault] = useState(false);

  // Uploaded reference images
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; filename: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Inline new-client form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientWebsite, setNewClientWebsite] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Chaos mode
  const [funMode, setFunMode] = useState(false);
  // Live progress messages streamed from the API
  const [progressMessages, setProgressMessages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          // API returns a plain array
          setClients(Array.isArray(data) ? data : (data.clients ?? []));
        }
      })
      .catch(() => {});
    fetch("/api/tools/landing-pages/templates")
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setTemplates(data.templates ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    if (newClientId) {
      const client = clients.find((c) => c.id === newClientId);
      if (client?.website && !url) setUrl(client.website);
      // Prefill tracking from client default if the user hasn't set anything yet
      if (client?.defaultAnalyticsConfig) {
        try {
          const parsed = JSON.parse(client.defaultAnalyticsConfig) as LpAnalyticsConfig;
          setInheritedAnalytics(parsed);
          setAnalyticsConfig((prev) => (Object.keys(prev).length === 0 ? parsed : prev));
        } catch {
          setInheritedAnalytics(undefined);
        }
      } else {
        setInheritedAnalytics(undefined);
      }
    } else {
      setInheritedAnalytics(undefined);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setClientError("Client name is required.");
      return;
    }
    setCreatingClient(true);
    setClientError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          website: newClientWebsite.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClientError(data.error ?? "Failed to create client");
        return;
      }
      const created: Client = { id: data.id, name: data.name, website: data.website };
      setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setClientId(created.id);
      if (created.website && !url) setUrl(created.website);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientWebsite("");
    } catch {
      setClientError("Network error — please try again.");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImageUploadError(null);
    setUploadingImage(true);
    try {
      const uploads = Array.from(files);
      const results: { url: string; filename: string }[] = [];
      for (const file of uploads) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/tools/landing-pages/upload-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setImageUploadError(data.error ?? "Upload failed");
          break;
        }
        results.push({ url: data.url, filename: file.name });
      }
      setUploadedImages((prev) => [...prev, ...results]);
    } catch {
      setImageUploadError("Network error — please try again.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSuggestAudiences = async () => {
    if (brief.trim().length < 20) return;
    setSuggestingAudiences(true);
    setAudienceSuggestError(null);
    try {
      const res = await fetch("/api/tools/landing-pages/suggest-audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          campaignType,
          targetOffering: targetOffering || undefined,
          clientId: clientId || undefined,
          clientName: clients.find((c) => c.id === clientId)?.name,
        }),
      });
      const data = (await res.json()) as {
        audiences?: { name: string; description: string }[];
        error?: string;
      };
      if (!res.ok) {
        setAudienceSuggestError(data.error || "Failed to suggest audiences");
        return;
      }
      setSuggestedAudiences(Array.isArray(data.audiences) ? data.audiences : []);
    } catch (err) {
      setAudienceSuggestError(err instanceof Error ? err.message : "Failed to suggest audiences");
    } finally {
      setSuggestingAudiences(false);
    }
  };

  const handleGenerate = async () => {
    if (!title || !url || !brief) {
      setError("Please fill in the title, website URL, and brief.");
      return;
    }
    setLoading(true);
    setError(null);
    setProgressMessages([]);

    try {
      const res = await fetch("/api/tools/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          title,
          url,
          brief,
          campaignType,
          targetOffering: targetOffering || undefined,
          targetAudience: targetAudience || undefined,
          customSubdomain: customSubdomain.trim() || undefined,
          requestedComponentIds:
            requestedComponentIds.length > 0 ? requestedComponentIds : undefined,
          templateId: templateId || undefined,
          analyticsConfig: Object.keys(analyticsConfig).length > 0 ? analyticsConfig : undefined,
          additionalImageUrls:
            uploadedImages.length > 0 ? uploadedImages.map((i) => i.url) : undefined,
          additionalUrls:
            additionalUrls.filter((u) => u.trim()).length > 0
              ? additionalUrls.filter((u) => u.trim())
              : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError((data.error as string | undefined) ?? "Generation failed");
        setLoading(false);
        return;
      }

      // Consume the NDJSON stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let landingPageId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as {
              type: string;
              message?: string;
              landingPage?: { id: string };
              scrapeWarnings?: string[];
            };
            if (event.type === "progress" && event.message) {
              setProgressMessages((prev) => [...prev, event.message!]);
            } else if (event.type === "done" && event.landingPage) {
              landingPageId = event.landingPage.id;

              if (event.scrapeWarnings?.length) {
                setProgressMessages((prev) => [
                  ...prev,
                  ...event.scrapeWarnings!.map((warning) => `Warning: ${warning}`),
                ]);
              }

              // Optionally persist client default
              if (saveAsClientDefault && clientId && Object.keys(analyticsConfig).length > 0) {
                fetch(`/api/clients/${clientId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ defaultAnalyticsConfig: analyticsConfig }),
                }).catch(() => {});
              }
            } else if (event.type === "error") {
              setError(event.message ?? "Generation failed");
              setLoading(false);
              return;
            }
          } catch {
            /* skip malformed line */
          }
        }
      }

      // ── Helper: consume one audit stream, prefixing progress messages ──
      const runAuditPass = async (id: string, passLabel: string) => {
        const auditRes = await fetch(`/api/tools/landing-pages/${id}/audit`, { method: "POST" });
        if (!auditRes.ok || !auditRes.body) return;
        const auditReader = auditRes.body.getReader();
        const auditDecoder = new TextDecoder();
        let auditBuf = "";
        while (true) {
          const { done, value } = await auditReader.read();
          if (done) break;
          auditBuf += auditDecoder.decode(value, { stream: true });
          const lines = auditBuf.split("\n");
          auditBuf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line) as { type: string; message?: string };
              if (event.type === "progress" && event.message) {
                setProgressMessages((prev) => [...prev, `${passLabel}: ${event.message!}`]);
              }
              // "error" from audit is non-fatal — page was already saved
            } catch {
              /* skip malformed */
            }
          }
        }
      };

      // ── Job 2: audit pass 1 — separate Vercel invocation, own 300 s budget ──
      if (landingPageId) {
        await runAuditPass(landingPageId, "Optimising (pass 1)");

        // ── Job 3: audit pass 2 — reads the pass-1 result from DB, own 300 s budget ──
        await runAuditPass(landingPageId, "Optimising (pass 2)");

        setGeneratedLpId(landingPageId);
        router.push(`/tools/landing-pages/${landingPageId}`);
        setLoading(false);
      } else {
        setError("Generation completed but no page ID was returned.");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Generation screen (replaces form while AI is working) ────────────── */}
      {loading && (
        <LpGeneratingScreen
          funMode={funMode}
          messages={progressMessages}
          title={title}
          onChaosToggle={() => setFunMode((v) => !v)}
        />
      )}

      {/* ── Form (hidden while generating) ──────────────────────────────────── */}
      <div className="page" style={{ maxWidth: 720, display: loading ? "none" : undefined }}>
        <ClientBackLink />
        {/* Back link */}
        <Link
          href="/tools/landing-pages"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--text-3)",
            marginBottom: 16,
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to landing pages
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            Create Landing Page
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            Provide a website to scrape for branding and a brief — Meridian will generate an
            optimised LP
          </p>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Client selection */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Client <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                {!showNewClient && (
                  <button
                    type="button"
                    onClick={() => setShowNewClient(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "var(--accent)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    <Plus style={{ width: 13, height: 13 }} /> New client
                  </button>
                )}
              </div>

              {showNewClient ? (
                <div
                  style={{
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--r)",
                    padding: "14px 16px",
                    background: "var(--accent-bg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", margin: 0 }}>
                    New client
                  </p>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client name *"
                    style={inputStyle}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateClient();
                      if (e.key === "Escape") setShowNewClient(false);
                    }}
                  />
                  <input
                    type="url"
                    value={newClientWebsite}
                    onChange={(e) => setNewClientWebsite(e.target.value)}
                    placeholder="Website (optional, e.g. https://example.com)"
                    style={inputStyle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateClient();
                      if (e.key === "Escape") setShowNewClient(false);
                    }}
                  />
                  {clientError && (
                    <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{clientError}</p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={creatingClient || !newClientName.trim()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        background: "var(--accent)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "var(--r)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: creatingClient ? "not-allowed" : "pointer",
                        opacity: creatingClient ? 0.7 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {creatingClient ? (
                        <Loader2
                          style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        <Check style={{ width: 13, height: 13 }} />
                      )}
                      {creatingClient ? "Creating…" : "Create & select"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewClient(false);
                        setNewClientName("");
                        setNewClientWebsite("");
                        setClientError(null);
                      }}
                      style={{
                        padding: "7px 14px",
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r)",
                        fontSize: 13,
                        cursor: "pointer",
                        color: "var(--text-2)",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">No client (standalone)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>
                Landing Page Title <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Camp 2026 — Enrol Now"
                style={inputStyle}
              />
            </div>

            {/* Website URL */}
            <div>
              <label style={labelStyle}>
                Website URL to Scrape <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <Globe
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    color: "var(--text-3)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.example.com"
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
                We&apos;ll extract brand colours, fonts, logos, and imagery from this site
              </p>
            </div>

            {/* Additional reference URLs */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Additional Pages to Scrape{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAdditionalUrls((prev) => [...prev, ""])}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> Add URL
                </button>
              </div>
              {additionalUrls.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {additionalUrls.map((u, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Globe
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 14,
                            height: 14,
                            color: "var(--text-3)",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          type="url"
                          value={u}
                          onChange={(e) =>
                            setAdditionalUrls((prev) =>
                              prev.map((v, j) => (j === i ? e.target.value : v)),
                            )
                          }
                          placeholder="https://www.example.com/services"
                          style={{ ...inputStyle, paddingLeft: 34 }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdditionalUrls((prev) => prev.filter((_, j) => j !== i))}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "var(--r)",
                          border: "1px solid var(--border)",
                          background: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-3)",
                          flexShrink: 0,
                        }}
                        title="Remove URL"
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.5 }}>
                  Add service pages, product pages, or any other pages — the more content the AI
                  has, the richer the landing page
                </p>
              )}
            </div>

            {/* Campaign type */}
            <div>
              <label style={labelStyle}>Campaign Type</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 8,
                }}
              >
                {CAMPAIGN_TYPES.map((type) => {
                  const active = campaignType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setCampaignType(type.value)}
                      style={{
                        textAlign: "left" as const,
                        padding: "10px 14px",
                        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--r)",
                        background: active ? "var(--accent-bg)" : "var(--surface)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: active ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {type.label}
                      </span>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brief */}
            <div>
              <label style={labelStyle}>
                Campaign Brief <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="Describe the campaign: what you're promoting, key selling points, the offer, any deadlines or urgency, desired CTA action..."
                style={{ ...inputStyle, resize: "vertical" as const }}
              />
            </div>

            {/* Target offering — the ONE thing this PPC page sells */}
            <div>
              <label style={labelStyle}>
                Target Service / Product / Offering{" "}
                <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={targetOffering}
                onChange={(e) => setTargetOffering(e.target.value)}
                placeholder="e.g. GCSE Maths online tutoring — 1:1 weekly sessions"
                style={inputStyle}
              />
              <div
                style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4, lineHeight: 1.4 }}
              >
                The single service or product this page sells. Keeping the page laser-focused on one
                offering converts best on PPC.
              </div>
            </div>

            {/* Target audience */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Target Audience{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                  {/* Subdomain (standalone pages only) */}
                  {!clientId && (
                    <div>
                      <label style={labelStyle}>
                        Subdomain{" "}
                        <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={customSubdomain}
                        onChange={(e) =>
                          setCustomSubdomain(
                            e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                          )
                        }
                        placeholder="e.g. international-football-academy"
                        style={inputStyle}
                      />
                      <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
                        If empty, we auto-generate this from the website URL.
                      </p>
                    </div>
                  )}
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={brief.trim().length < 20 || suggestingAudiences}
                  onClick={handleSuggestAudiences}
                  title={
                    brief.trim().length < 20
                      ? "Write a brief first (20+ characters)"
                      : "Suggest audience options from the brief"
                  }
                >
                  {suggestingAudiences ? (
                    <Loader2
                      style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Sparkles style={{ width: 12, height: 12 }} />
                  )}
                  {suggestingAudiences ? "Suggesting…" : "Suggest from brief"}
                </button>
              </div>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Parents of children aged 14-19 in the UK"
                style={inputStyle}
              />
              {audienceSuggestError && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>
                  {audienceSuggestError}
                </div>
              )}
              {suggestedAudiences.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Pick one to use, or keep typing
                    </span>
                    <button
                      type="button"
                      onClick={() => setSuggestedAudiences([])}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-3)",
                        fontSize: 12,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <X style={{ width: 11, height: 11 }} /> Dismiss
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {suggestedAudiences.map((a) => {
                      const selected = targetAudience === a.name;
                      return (
                        <button
                          key={a.name}
                          type="button"
                          onClick={() => {
                            setTargetAudience(a.name);
                            setSuggestedAudiences([]);
                          }}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                            background: selected ? "var(--accent-bg)" : "var(--surface)",
                            color: "var(--text)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                            {a.name}
                          </div>
                          {a.description && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-3)",
                                marginTop: 3,
                                lineHeight: 1.4,
                              }}
                            >
                              {a.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Components to consider — collapsible CRO element picker */}
            <div>
              <button
                type="button"
                onClick={() => setComponentsExpanded((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                }}
                aria-expanded={componentsExpanded}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Zap style={{ width: 14, height: 14 }} />
                  Components to consider
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                  {requestedComponentIds.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "1px 8px",
                        borderRadius: 999,
                        background: "var(--accent-bg)",
                        color: "var(--accent)",
                      }}
                    >
                      {requestedComponentIds.length} selected
                    </span>
                  )}
                </span>
                <ChevronRight
                  style={{
                    width: 14,
                    height: 14,
                    transform: componentsExpanded ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
              {componentsExpanded && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}
                  >
                    Tick the conversion components you&apos;d like the AI to consider for this page.
                    The AI judges fit against your brief, offering and audience — it&apos;ll include
                    the ones that genuinely help and skip the rest. Pick from any category,
                    regardless of campaign type.
                  </div>
                  {(["urgency", "proof", "offer", "mechanics"] as CroCategory[]).map((cat) => {
                    const items = CRO_ELEMENTS.filter((el) => el.category === cat);
                    return (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: "var(--text-3)",
                            marginBottom: 8,
                          }}
                        >
                          {CRO_CATEGORY_LABELS[cat]}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: 6,
                          }}
                        >
                          {items.map((el) => {
                            const checked = requestedComponentIds.includes(el.id);
                            return (
                              <label
                                key={el.id}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 8,
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                                  background: checked ? "var(--accent-bg)" : "transparent",
                                  cursor: "pointer",
                                  fontSize: 12.5,
                                  lineHeight: 1.4,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setRequestedComponentIds((prev) =>
                                      e.target.checked
                                        ? [...prev, el.id]
                                        : prev.filter((id) => id !== el.id),
                                    );
                                  }}
                                  style={{ marginTop: 2, cursor: "pointer" }}
                                />
                                <span style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 600, color: "var(--text)" }}>
                                    {el.name}
                                  </span>
                                  <span
                                    style={{
                                      display: "block",
                                      color: "var(--text-3)",
                                      fontSize: 11.5,
                                      marginTop: 2,
                                    }}
                                  >
                                    {el.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {requestedComponentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRequestedComponentIds([])}
                      style={{
                        marginTop: 4,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-3)",
                        fontSize: 12,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <X style={{ width: 11, height: 11 }} /> Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Reference images */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Reference Images{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--accent)",
                    background: "none",
                    border: "none",
                    cursor: uploadingImage ? "not-allowed" : "pointer",
                    padding: 0,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    opacity: uploadingImage ? 0.6 : 1,
                  }}
                >
                  {uploadingImage ? (
                    <Loader2
                      style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Plus style={{ width: 13, height: 13 }} />
                  )}
                  {uploadingImage ? "Uploading…" : "Add images"}
                </button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleImageUpload(e.target.files)}
              />
              {uploadedImages.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {uploadedImages.map((img, i) => (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        borderRadius: "var(--r)",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        aspectRatio: "1",
                        background: "var(--bg)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.filename}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                        }}
                        title="Remove image"
                      >
                        <X style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      border: "1.5px dashed var(--border)",
                      borderRadius: "var(--r)",
                      background: "transparent",
                      cursor: uploadingImage ? "not-allowed" : "pointer",
                      aspectRatio: "1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      color: "var(--text-3)",
                    }}
                  >
                    {uploadingImage ? (
                      <Loader2
                        style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Upload style={{ width: 18, height: 18 }} />
                    )}
                    <span style={{ fontSize: 10 }}>Add more</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{
                    width: "100%",
                    padding: "18px 16px",
                    border: "1.5px dashed var(--border)",
                    borderRadius: "var(--r)",
                    background: "transparent",
                    cursor: uploadingImage ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-3)",
                    transition: "border-color 0.15s",
                  }}
                >
                  <ImageIcon style={{ width: 22, height: 22 }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {uploadingImage ? "Uploading…" : "Upload images for Claude to use"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                    Product photos, team shots, campaign imagery — supplements scraped site images
                  </span>
                </button>
              )}
              {imageUploadError && (
                <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>
                  {imageUploadError}
                </p>
              )}
            </div>

            {/* Template selection */}
            {templates.length > 0 && (
              <div>
                <label style={labelStyle}>
                  Start from Template{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() => setTemplateId("")}
                    style={{
                      textAlign: "left" as const,
                      padding: "10px 14px",
                      border: !templateId ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: "var(--r)",
                      background: !templateId ? "var(--accent-bg)" : "var(--surface)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 13,
                        fontWeight: 600,
                        color: !templateId ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      <Sparkles style={{ width: 13, height: 13 }} /> AI Freestyle
                    </span>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      Generate from scratch
                    </p>
                  </button>
                  {templates.map((t) => {
                    const active = templateId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        style={{
                          textAlign: "left" as const,
                          padding: "10px 14px",
                          border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: "var(--r)",
                          background: active ? "var(--accent-bg)" : "var(--surface)",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 13,
                            fontWeight: 600,
                            color: active ? "var(--accent)" : "var(--text)",
                          }}
                        >
                          {t.isBuiltIn ? (
                            <Grid3X3 style={{ width: 13, height: 13 }} />
                          ) : (
                            <FileText style={{ width: 13, height: 13 }} />
                          )}
                          {t.name}
                        </span>
                        {t.description && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--text-3)",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.description}
                          </p>
                        )}
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: "var(--border-subtle)",
                            color: "var(--text-3)",
                          }}
                        >
                          {t.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking & conversions */}
            <div>
              <AnalyticsConfigForm
                value={analyticsConfig}
                onChange={setAnalyticsConfig}
                inheritedFrom={inheritedAnalytics}
              />
              {clientId && Object.keys(analyticsConfig).length > 0 && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-3)",
                    marginTop: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={saveAsClientDefault}
                    onChange={(e) => setSaveAsClientDefault(e.target.checked)}
                  />
                  Also save as the default for{" "}
                  {clients.find((c) => c.id === clientId)?.name ?? "this client"}
                </label>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--r)",
                  color: "var(--danger-text)",
                  fontSize: 13,
                }}
              >
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--danger-text)",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}

            {/* Generate button */}
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading || !title || !url || !brief}
              style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Generate Landing Page
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Chaos overlay */}
      <LpChaosOverlay active={funMode && loading} />
    </>
  );
}

// ─── Full-screen generation view ─────────────────────────────────────────────

const PHASE_LABELS: Record<string, { icon: string; label: string }> = {
  "Analysing your website": { icon: "🔍", label: "Extracting brand identity" },
  "Planning page structure": { icon: "🗺️", label: "Planning page structure" },
  Generating: { icon: "⚡", label: "Generating sections" },
  Assembling: { icon: "🔧", label: "Assembling final page" },
  "Running CRO": { icon: "📈", label: "CRO audit" },
  Applying: { icon: "✏️", label: "Applying improvements" },
  "Taking page screenshot": { icon: "📸", label: "Capturing page screenshot" },
  "Running Design": { icon: "🎨", label: "Design & sector audit" },
  "Running Copy": { icon: "✍️", label: "Copy quality audit" },
  Saving: { icon: "💾", label: "Saving your page" },
};

function getPhaseInfo(msg: string): { icon: string; label: string } {
  for (const [key, val] of Object.entries(PHASE_LABELS)) {
    if (msg.startsWith(key)) return val;
  }
  return { icon: "⚙️", label: msg };
}

const CHAOS_PASSIVE_TAUNTS = [
  "go on. click me. i dare you.",
  "you know you want to click me 👀",
  "i'm right here... just saying...",
  "one click. that's all it takes.",
  "normal mode is so boring tho",
  "*stares at you expectantly*",
  "what's the worst that could happen? 😈",
  "click me coward",
  "i've been waiting for you...",
  "your landing page deserves chaos",
  "chaos = creativity, trust me bro",
  "the button is lonely 🥺",
  "this offer expires never but still",
  "all the cool kids have chaos ON",
  "i'm not NOT saying click me",
  "*taps foot impatiently*",
  "do it. DO IT.",
  "scared? 😏",
];

const CHAOS_ON_PASSIVE_TAUNTS = [
  "CHAOS MODE ACTIVE. YOU DID THIS. 🔥",
  "there's no going back now 😈",
  "oh you actually clicked it lmao",
  "IT'S ALIVE. IT'S ALIVE!!!",
  "maximum chaos achieved ✨",
];

function LpGeneratingScreen({
  funMode,
  messages,
  title,
  onChaosToggle,
}: {
  funMode: boolean;
  messages: string[];
  title: string;
  onChaosToggle: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [passiveTaunt, setPassiveTaunt] = useState<string | null>(null);
  const passiveTauntRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passiveHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Passive taunts that pop above the chaos button when not generating
  useEffect(() => {
    function scheduleNext() {
      const delay = funMode ? 3500 + Math.random() * 3000 : 5000 + Math.random() * 8000;
      passiveTauntRef.current = setTimeout(() => {
        const pool = funMode ? CHAOS_ON_PASSIVE_TAUNTS : CHAOS_PASSIVE_TAUNTS;
        setPassiveTaunt(pool[Math.floor(Math.random() * pool.length)]);
        passiveHideRef.current = setTimeout(() => {
          setPassiveTaunt(null);
          scheduleNext();
        }, 3500);
      }, delay);
    }
    const initId = setTimeout(scheduleNext, 3000);
    return () => {
      clearTimeout(initId);
      if (passiveTauntRef.current) clearTimeout(passiveTauntRef.current);
      if (passiveHideRef.current) clearTimeout(passiveHideRef.current);
    };
  }, [funMode]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentMsg = messages[messages.length - 1] ?? "Starting…";
  const { icon } = getPhaseInfo(currentMsg);

  // Progress: treat each message as a step out of expected ~14 phases
  const TOTAL_STEPS = 14;
  const progress = Math.min(95, (messages.length / TOTAL_STEPS) * 100);

  function formatTime(s: number) {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      {/* ── Chaos toggle button — top centre ── */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          zIndex: 8100,
        }}
      >
        {passiveTaunt && (
          <div
            style={{
              background: funMode ? "rgba(239,68,68,0.95)" : "rgba(30,30,40,0.92)",
              color: funMode ? "#fff" : "#e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: "10px 10px 10px 2px",
              maxWidth: 240,
              lineHeight: 1.4,
              textAlign: "center",
              boxShadow: funMode ? "0 4px 20px rgba(239,68,68,0.4)" : "0 4px 16px rgba(0,0,0,0.4)",
              border: funMode
                ? "1px solid rgba(255,100,100,0.5)"
                : "1px solid rgba(255,255,255,0.1)",
              animation: "lpTauntPop 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              fontFamily: funMode ? '"Comic Sans MS", cursive' : "inherit",
              pointerEvents: "none",
            }}
          >
            {passiveTaunt}
          </div>
        )}
        <button
          type="button"
          onClick={onChaosToggle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 20,
            border: funMode ? "1px solid rgba(239,68,68,0.7)" : "1px solid var(--border)",
            background: funMode
              ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
              : "var(--surface)",
            color: funMode ? "#fff" : "var(--text-3)",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: funMode ? "0 4px 20px rgba(239,68,68,0.4)" : "0 2px 8px rgba(0,0,0,0.12)",
            transition: "all 0.2s",
            fontFamily: "inherit",
          }}
          title={funMode ? "Disable chaos mode" : "Enable chaos mode 🔥"}
        >
          <Zap style={{ width: 12, height: 12, flexShrink: 0 }} />
          {funMode ? "Chaos ON" : "Chaos Mode"}
        </button>
      </div>

      {/* Central icon + status */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            fontSize: 48,
            lineHeight: 1,
            marginBottom: 16,
            animation: "lpGenIconBounce 1.4s ease-in-out infinite",
            display: "inline-block",
          }}
        >
          {icon}
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 6px",
            fontFamily: funMode ? '"Comic Sans MS", "Comic Sans", cursive' : "inherit",
          }}
        >
          {funMode ? "MERIDIAN IS GOING ABSOLUTELY FERAL 🔥" : `Generating "${title}"`}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
          {funMode ? currentMsg.toUpperCase() : currentMsg}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          height: funMode ? 10 : 6,
          borderRadius: 99,
          background: "var(--border)",
          overflow: "visible",
          marginBottom: 8,
          position: "relative",
          transition: "height 0.3s",
        }}
      >
        {funMode ? (
          <>
            <style>{`
              @keyframes lpRainbowShift {
                0%   { background-position: 0% 50%; }
                50%  { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              @keyframes lpBarWave {
                0%,100% { clip-path: polygon(0 15%, 100% 15%, 100% 85%, 0 85%); }
                12% { clip-path: polygon(0 5%, 8% 40%, 16% 5%, 25% 45%, 33% 3%, 42% 42%, 50% 5%, 58% 42%, 66% 3%, 75% 45%, 83% 5%, 91% 40%, 100% 8%, 100% 92%, 91% 60%, 83% 95%, 75% 55%, 66% 97%, 58% 58%, 50% 95%, 42% 58%, 33% 97%, 25% 55%, 16% 95%, 8% 60%, 0 95%); }
                25% { clip-path: polygon(0 25%, 10% 0%, 20% 30%, 30% 2%, 40% 28%, 50% 0%, 60% 28%, 70% 2%, 80% 30%, 90% 0%, 100% 22%, 100% 78%, 90% 100%, 80% 70%, 70% 98%, 60% 72%, 50% 100%, 40% 72%, 30% 98%, 20% 70%, 10% 100%, 0 75%); }
                37% { clip-path: polygon(0 10%, 7% 45%, 15% 8%, 23% 50%, 31% 6%, 39% 48%, 47% 10%, 55% 48%, 63% 6%, 71% 50%, 79% 8%, 87% 45%, 95% 12%, 100% 35%, 100% 88%, 95% 65%, 87% 92%, 79% 62%, 71% 95%, 63% 65%, 55% 92%, 47% 60%, 39% 95%, 31% 65%, 23% 92%, 15% 62%, 7% 95%, 0 68%); }
                50% { clip-path: polygon(0 20%, 9% 0%, 18% 25%, 27% 0%, 36% 22%, 45% 0%, 54% 22%, 63% 0%, 72% 25%, 81% 0%, 90% 22%, 100% 5%, 100% 80%, 90% 100%, 81% 75%, 72% 100%, 63% 78%, 54% 100%, 45% 78%, 36% 100%, 27% 78%, 18% 100%, 9% 78%, 0 100%); }
                62% { clip-path: polygon(0 8%, 6% 42%, 14% 6%, 22% 46%, 30% 4%, 38% 44%, 46% 8%, 54% 44%, 62% 4%, 70% 46%, 78% 6%, 86% 42%, 94% 8%, 100% 30%, 100% 92%, 94% 70%, 86% 94%, 78% 64%, 70% 96%, 62% 66%, 54% 94%, 46% 62%, 38% 96%, 30% 66%, 22% 94%, 14% 64%, 6% 92%, 0 70%); }
                75% { clip-path: polygon(0 18%, 11% 0%, 22% 22%, 33% 0%, 44% 20%, 55% 0%, 66% 20%, 77% 0%, 88% 22%, 100% 4%, 100% 82%, 88% 100%, 77% 78%, 66% 100%, 55% 80%, 44% 100%, 33% 80%, 22% 100%, 11% 80%, 0 100%); }
                87% { clip-path: polygon(0 12%, 8% 48%, 17% 10%, 26% 52%, 35% 8%, 44% 50%, 53% 12%, 62% 50%, 71% 8%, 80% 52%, 89% 10%, 98% 48%, 100% 25%, 100% 88%, 98% 62%, 89% 90%, 80% 58%, 71% 92%, 62% 60%, 53% 88%, 44% 60%, 35% 92%, 26% 62%, 17% 90%, 8% 62%, 0 88%); }
              }
              @keyframes lpBarGlow {
                0%,100% { filter: brightness(1.2) drop-shadow(0 0 8px #f0f) drop-shadow(0 0 16px #0ff); }
                33%  { filter: brightness(1.4) drop-shadow(0 0 12px #ff0) drop-shadow(0 0 24px #f0f); }
                66%  { filter: brightness(1.3) drop-shadow(0 0 10px #0ff) drop-shadow(0 0 20px #0f0); }
              }
              @keyframes lpTauntPop {
                0%   { opacity: 0; transform: scale(0.7) translateX(12px); }
                100% { opacity: 1; transform: scale(1) translateX(0); }
              }
            `}</style>
            <div
              style={{
                position: "absolute",
                top: -2,
                left: 0,
                height: 14,
                borderRadius: 99,
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #ff0080, #ff8c00, #ffed00, #00ff40, #00cfff, #cc00ff, #ff0080, #ff8c00, #ffed00)",
                backgroundSize: "300% 300%",
                animation:
                  "lpRainbowShift 1.2s ease infinite, lpBarWave 1s ease-in-out infinite, lpBarGlow 1.5s ease-in-out infinite",
                transition: "width 0.6s ease",
              }}
            />
          </>
        ) : (
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: "var(--accent)",
              width: `${progress}%`,
              transition: "width 0.6s ease",
            }}
          />
        )}
      </div>
      <p style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 32 }}>
        {formatTime(elapsed)} elapsed · {messages.length} of ~{TOTAL_STEPS} steps complete
      </p>

      {/* Scrollable message history */}
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: 220,
          overflowY: "auto",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.map((msg, i) => {
          const isLatest = i === messages.length - 1;
          const info = getPhaseInfo(msg);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                opacity: isLatest ? 1 : 0.45,
                transition: "opacity 0.3s",
                animation: isLatest ? "fadeIn 0.3s ease" : undefined,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "20px" }}>{info.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  color: isLatest ? "var(--text)" : "var(--text-3)",
                  lineHeight: 1.5,
                }}
              >
                {funMode ? msg.toUpperCase() : msg}
              </span>
              {isLatest && (
                <Loader2
                  style={{
                    width: 12,
                    height: 12,
                    color: "var(--accent)",
                    animation: "spin 1s linear infinite",
                    flexShrink: 0,
                    marginTop: 4,
                    marginLeft: "auto",
                  }}
                />
              )}
            </div>
          );
        })}
        {messages.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.5 }}>
            <Loader2
              style={{
                width: 12,
                height: 12,
                color: "var(--accent)",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Starting up…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <style>{`
        @keyframes lpGenIconBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

// ─── LP Chaos Mode — even more extreme than Grand Plan ────────────────────────

const LP_UWU_MESSAGES = [
  "AAAAAAA~!! MERIDIAN-SENPAI IS BUILDING UR LANDING PAGE AND I CANNOT BE CALM RN (⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄",
  "*VIOLENTLY SCRAPES YOUR WEBSITE FOR BRAND ASSETS* THE COLOURS... THE FONTS... THEYRE SO PRETTY I WANNA DIE",
  "OH NO OH NO THE HERO SECTION IS SO COMPELLING I HAVE LOST THE ABILITY TO COPE >///<",
  "MERIDIAN IS CRAFTING YOUR CTA AND SHE IS NOT OKAY ABOUT HOW GOOD IT IS. NONE OF US ARE.",
  "b-b-building the above-the-fold section with my ENTIRE SOUL on the line rawr xD",
  "THE H1 HEADLINE JUST DROPPED AND I AM ON THE FLOOR. ON THE LITERAL FLOOR.",
  "NANI?!? the conversion funnel is SO PERFECTLY STRUCTURED i need a moment to process (╯°□°）╯︵ ┻━┻",
  "*AGGRESSIVELY NUZZLES THE FORM LAYOUT* WHO'S A GOOD LEAD CAPTURE WIDGET. YOU ARE. YOU ARE.",
  "SOCIAL PROOF SECTION GENERATING AND I AM EMOTIONALLY DEVASTATED BY EACH TESTIMONIAL (ᵕ̣̣̣̣̣̣﹏ᵕ̣̣̣̣̣̣)",
  "the brand colours have been extracted and they are SENDING ME. I AM SENT. GOODBYE.",
  "MERIDIAN JUST WROTE BODY COPY THAT WOULD MAKE DAVID OGILVY CRY AND SO AM I ✧*｡٩(ˊᗜˋ*)و*｡✧",
  "*SLAMS PAWS ON KEYBOARD* THE BENEFIT ICONS ARE PIXEL-PERFECT AND I CANNOT DEAL",
  "OwO *notices ur trust signals* WHAT'S THIS?? A MONEY-BACK GUARANTEE?? FOR ME?? (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)",
  "THE FAQ SECTION JUST ANSWERED A QUESTION I DIDN'T EVEN KNOW I HAD AND I AM NOT WELL",
  "assembling the ENTIRE PAGE STRUCTURE like a chaotic megazord of conversion optimisation ✧✧✧",
  "i-i-i can't believe how beautiful this page is... the whitespace is GIVING ME FEELINGS",
  "*sniffles* the mobile responsive layout... it's PERFECT... every breakpoint... PRECIOUS",
  "WRITING THE META DESCRIPTION AND IT'S SO SEO-OPTIMISED I NEED TO LIE DOWN IMMEDIATELY",
  "the sticky nav is SO SMART. WHO GAVE MERIDIAN PERMISSION TO BE THIS CLEVER. WHO.",
  "FOOTER SECTION INCOMING AND I AM HAVING A FULL BREAKDOWN ABOUT THE PRIVACY POLICY LINK",
  "MERIDIAN GO BWRRRRRRR ✧*｡ ٩(ˊᗜˋ*)و ✧*｡ YOUR PAGE WILL BE BEAUTIFUL AND I WILL PERISH",
  "the above-fold viewport is so OPTIMISED for first impressions I have physically left my body",
  "GENERATING MICROCOPY FOR FORM FIELDS AND EVERY PLACEHOLDER TEXT IS A MASTERPIECE I QUIT",
  "*cradles the HTML output tenderly* shhhh... you're going to convert SO MANY VISITORS... yes you are...",
  "oh no oh no MERIDIAN IS GOING FERAL ON THE BENEFITS SECTION SOMEONE CALL A CONVERSION SPECIALIST",
  "the page speed score is going to be IMMACULATE and I am having RELIGIOUS FEELINGS about it >:3",
  "I HAVE PUT MY ENTIRE EXISTENCE INTO THIS LANDING PAGE AND IF THE BOUNCE RATE IS HIGH I WILL PERISH",
  "the CTA button colour contrast ratio just passed WCAG AAA and I am SOBBING WITH JOY (ᗒᗨᗕ)",
  "*BOOPS THE RENDER BUTTON REPEATEDLY* MAKE THE PRETTY HTML NOW PLEASE AND THANK YOU (◕‿◕✿)",
  "INITIATING FINAL HTML ASSEMBLY. LANDING PAGE BLAST OFF IN 3... 2... 1... UWU~!!! KACHOW.",
];

function useLpUwu(active: boolean): { msg: string; pos: { top: string; left: string } } {
  const [state, setState] = useState({ msg: LP_UWU_MESSAGES[0], pos: randomMsgPos() });
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const shuffled = [...LP_UWU_MESSAGES].sort(() => Math.random() - 0.5);
    indexRef.current = 0;
    const first = setTimeout(() => setState({ msg: shuffled[0], pos: randomMsgPos() }), 0);
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % shuffled.length;
      setState({ msg: shuffled[indexRef.current], pos: randomMsgPos() });
    }, 4200); // ~2.4s longer than before — messages linger
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);

  return state;
}

function playLpChaosBleep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC() as AudioContext;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    // Two oscillators for a richer/more chaotic sound
    const FREQS = [220, 261, 329, 392, 440, 523, 659, 784, 880, 1046, 1318, 1568];
    osc.frequency.value = FREQS[Math.floor(Math.random() * FREQS.length)];
    osc2.frequency.value = FREQS[Math.floor(Math.random() * FREQS.length)] * 1.5;
    osc.type = (["square", "sawtooth", "triangle"] as OscillatorType[])[
      Math.floor(Math.random() * 3)
    ];
    osc2.type = "sawtooth";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
    osc2.stop(ctx.currentTime + 0.14);
    osc.onended = () => ctx.close();
  } catch {
    /* AudioContext blocked — silent fail */
  }
}

function randomMsgPos() {
  // Keep the box fully on-screen (box is centred on this point, max ~680px wide ~120px tall)
  // Divide viewport into a 3×3 grid of zones and pick one at random to spread it around
  const zones = [
    { top: "12%", left: "25%" },
    { top: "12%", left: "50%" },
    { top: "12%", left: "75%" },
    { top: "42%", left: "20%" },
    { top: "42%", left: "50%" },
    { top: "42%", left: "78%" },
    { top: "72%", left: "25%" },
    { top: "72%", left: "50%" },
    { top: "72%", left: "75%" },
  ];
  // Add a small random jitter within each zone so it never lands in exactly the same spot
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const jitterTop = (Math.random() - 0.5) * 8;
  const jitterLeft = (Math.random() - 0.5) * 8;
  return {
    top: `calc(${zone.top}  + ${jitterTop.toFixed(1)}%)`,
    left: `calc(${zone.left} + ${jitterLeft.toFixed(1)}%)`,
  };
}

function LpChaosOverlay({ active }: { active: boolean }) {
  const { msg: uwuMsg, pos: msgPos } = useLpUwu(active);
  const [particles, setParticles] = useState<
    {
      id: number;
      emoji: string;
      x: number;
      y: number;
      size: number;
      opacity: number;
      rotation: number;
      scale: number;
      delay: number;
      skewX: number;
      skewY: number;
    }[]
  >([]);

  // ── Inject chaos CSS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      document.documentElement.style.removeProperty("filter");
      document.documentElement.style.removeProperty("animation");
      return;
    }
    const styleId = "lp-chaos-global-styles";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        @keyframes lpHueSpin {
          0%   { filter: hue-rotate(0deg) saturate(3) brightness(1.1) contrast(1.05); }
          15%  { filter: hue-rotate(54deg) saturate(4.5) brightness(1.2) contrast(1.1); }
          30%  { filter: hue-rotate(108deg) saturate(5) brightness(0.9) contrast(1.15) invert(0.06); }
          45%  { filter: hue-rotate(162deg) saturate(4) brightness(1.3) contrast(1.05); }
          60%  { filter: hue-rotate(216deg) saturate(5.5) brightness(1.0) contrast(1.2) invert(0.03); }
          75%  { filter: hue-rotate(270deg) saturate(4.5) brightness(1.15) contrast(1.1); }
          90%  { filter: hue-rotate(324deg) saturate(3.5) brightness(1.25) contrast(1.08) invert(0.05); }
          100% { filter: hue-rotate(360deg) saturate(3) brightness(1.1) contrast(1.05); }
        }
        @keyframes lpBodyShake {
          0%,100% { transform: translate(0,0) rotate(0deg) skewX(0deg); }
          8%  { transform: translate(-5px, 3px) rotate(-0.7deg) skewX(-0.5deg); }
          16% { transform: translate(5px, -4px) rotate(0.7deg) skewX(0.5deg); }
          24% { transform: translate(-4px, 5px) rotate(-0.4deg) skewX(-0.3deg); }
          32% { transform: translate(6px, -2px) rotate(0.5deg) skewX(0.4deg); }
          40% { transform: translate(-5px, -5px) rotate(-0.8deg) skewX(-0.6deg); }
          48% { transform: translate(4px, 5px) rotate(0.4deg) skewX(0.3deg); }
          56% { transform: translate(-7px, 2px) rotate(-0.6deg) skewX(-0.4deg); }
          64% { transform: translate(5px, -5px) rotate(0.7deg) skewX(0.5deg); }
          72% { transform: translate(-3px, 4px) rotate(-0.3deg) skewX(-0.2deg); }
          80% { transform: translate(6px, -3px) rotate(0.6deg) skewX(0.4deg); }
          90% { transform: translate(-4px, 3px) rotate(-0.2deg) skewX(-0.3deg); }
        }
        @keyframes lpGlitchText {
          0%,85%,100% { text-shadow: none; }
          86% { text-shadow: -4px 0 #f0f, 4px 0 #0ff, 0 3px #ff0; }
          88% { text-shadow: 4px 0 #f0f, -4px 0 #0ff, 0 -3px #0f0; }
          90% { text-shadow: -3px 2px #ff0, 3px -2px #f0f, 2px 0 #0ff; }
          92% { text-shadow: 5px 0 #0ff, -5px 0 #f0f; }
          94% { text-shadow: -2px 0 #0f0, 2px 0 #f00; }
        }
        @keyframes lpScanlines {
          0%   { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
        @keyframes lpChaosFloat {
          0%   { transform: translateY(0) rotate(0deg) scale(1) skewX(0deg); }
          25%  { transform: translateY(-35px) rotate(180deg) scale(1.4) skewX(5deg); }
          50%  { transform: translateY(15px) rotate(270deg) scale(0.7) skewX(-3deg); }
          75%  { transform: translateY(-20px) rotate(350deg) scale(1.2) skewX(2deg); }
          100% { transform: translateY(0) rotate(360deg) scale(1) skewX(0deg); }
        }
        @keyframes lpRgbSplit {
          0%,100% { text-shadow: -2px 0 rgba(255,0,0,0.7), 2px 0 rgba(0,255,255,0.7); }
          25% { text-shadow: 3px 0 rgba(255,0,0,0.7), -3px 0 rgba(0,255,255,0.7); }
          50% { text-shadow: -3px 2px rgba(255,0,255,0.7), 3px -2px rgba(0,255,0,0.7); }
          75% { text-shadow: 2px -2px rgba(255,255,0,0.7), -2px 2px rgba(0,0,255,0.7); }
        }
        .lp-chaos-active * {
          animation: lpGlitchText 3s infinite !important;
        }
        .lp-chaos-active h1, .lp-chaos-active h2, .lp-chaos-active h3 {
          font-family: "Comic Sans MS", "Comic Sans", cursive !important;
          letter-spacing: 0.08em !important;
          animation: lpRgbSplit 0.8s infinite !important;
        }
        .lp-chaos-active {
          animation: lpBodyShake 0.12s infinite, lpHueSpin 1.5s linear infinite !important;
        }
        .lp-chaos-scanlines::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9998;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.04) 2px,
            rgba(0,0,0,0.04) 4px
          );
          animation: lpScanlines 0.5s linear infinite;
        }
      `;
      document.head.appendChild(el);
    }
    document.documentElement.classList.add("lp-chaos-active", "lp-chaos-scanlines");
    return () => {
      document.documentElement.classList.remove("lp-chaos-active", "lp-chaos-scanlines");
    };
  }, [active]);

  // ── Bleeps — faster interval than Grand Plan ───────────────────────────────
  useEffect(() => {
    if (!active) return;
    playLpChaosBleep();
    let timeoutId: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      timeoutId = setTimeout(
        () => {
          playLpChaosBleep();
          scheduleNext();
        },
        400 + Math.random() * 500,
      ); // 400–900ms (vs 600–1800ms in Grand Plan)
    }
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [active]);

  // ── Floating emoji particles — 90 particles, 150ms update ─────────────────
  useEffect(() => {
    if (!active) {
      queueMicrotask(() => setParticles([]));
      return;
    }
    const EMOJIS = [
      "✨",
      "💖",
      "🌸",
      "⭐",
      "🎀",
      "💫",
      "🦄",
      "🌈",
      "😻",
      "💕",
      "🎪",
      "🚀",
      "📊",
      "📈",
      "🎯",
      "💅",
      "✌️",
      "🔥",
      "👑",
      "🎉",
      "💣",
      "🤯",
      "🫠",
      "😱",
      "UwU",
      "OwO",
      ">.<",
      ":3",
      "rawr",
      "xD",
      "nyan~",
      "BAKA",
      "brrrr",
      "404",
      "ERROR",
      "NaN",
      "null",
      "undefined",
      "😈",
      "🧨",
      "💥",
      "🌊",
      "CTR",
      "CTA",
      "H1",
      "div",
      "px",
      "rem",
      "vw",
      "vh",
      "HTML",
      "CSS",
      "CONVERT",
      "CLICK",
      "BOUNCE",
      "SCROLL",
      "FUNNEL",
      "🎨",
      "🖼️",
      "💻",
      "W",
      "T",
      "F",
      "LOL",
      "HELP",
      "WHY",
      "HOW",
      "YES",
      "NO",
      "???",
      "!!!",
    ];
    const initial = Array.from({ length: 90 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 44,
      opacity: 0.15 + Math.random() * 0.5,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.6,
      delay: Math.random() * 2,
      skewX: (Math.random() - 0.5) * 20,
      skewY: (Math.random() - 0.5) * 10,
    }));
    queueMicrotask(() => setParticles(initial));
    const id = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + (Math.random() - 0.5) * 7 + 100) % 100,
          y: (p.y - 0.6 - Math.random() * 1.2 + 100) % 100,
          rotation: p.rotation + (Math.random() - 0.5) * 40,
          opacity: 0.1 + Math.random() * 0.55,
          scale: 0.4 + Math.random() * 1.8,
          skewX: (Math.random() - 0.5) * 20,
          skewY: (Math.random() - 0.5) * 10,
        })),
      );
    }, 150); // 150ms (vs 300ms in Grand Plan)
    return () => clearInterval(id);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* UwU status message — jumps to a new random position each message */}
      <div
        style={{
          position: "fixed",
          top: msgPos.top,
          left: msgPos.left,
          transform: "translate(-50%, -50%)",
          transition:
            "top 0.15s cubic-bezier(0.34,1.56,0.64,1), left 0.15s cubic-bezier(0.34,1.56,0.64,1)",
          maxWidth: "min(680px, 90vw)",
          background: "rgba(0,0,0,0.92)",
          color: "#f9a8d4",
          fontSize: 20,
          fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
          fontWeight: 700,
          padding: "20px 32px",
          borderRadius: 16,
          border: "2px solid #f0f",
          textAlign: "center",
          lineHeight: 1.5,
          zIndex: 10000,
          letterSpacing: "0.02em",
          boxShadow: "0 0 40px rgba(255,0,255,0.6), 0 0 16px rgba(0,255,255,0.5)",
          pointerEvents: "none",
        }}
      >
        {uwuMsg}
      </div>

      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            fontSize: p.size,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) scale(${p.scale}) skewX(${p.skewX}deg) skewY(${p.skewY}deg)`,
            userSelect: "none",
            lineHeight: 1,
            willChange: "transform, opacity",
            filter:
              p.size > 30
                ? "drop-shadow(0 0 16px rgba(249,168,212,0.95)) drop-shadow(0 0 6px #f0f) drop-shadow(0 0 3px #0ff)"
                : "drop-shadow(0 0 4px rgba(249,168,212,0.6))",
            animation: `lpChaosFloat ${1.2 + p.delay}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
