"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { GenerationProgress } from "@/components/ui/GenerationProgress";
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
  { value: "lead-gen", label: "Lead Generation", description: "Capture leads with a form-focused page" },
  { value: "event", label: "Event / Campaign", description: "Promote an event, offer, or seasonal campaign" },
  { value: "product-launch", label: "Product Launch", description: "Showcase a new product or service" },
  { value: "service", label: "Service Landing", description: "Convert visitors for a specific service" },
  { value: "ecommerce", label: "E-commerce", description: "Drive product sales and conversions" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid var(--border)", borderRadius: "var(--r)",
  fontSize: 14, color: "var(--text)", background: "var(--surface)",
  outline: "none", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 6,
};

export default function NewLandingPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [campaignType, setCampaignType] = useState("lead-gen");
  const [targetAudience, setTargetAudience] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Tracking & conversions
  const [analyticsConfig, setAnalyticsConfig] = useState<LpAnalyticsConfig>({});
  const [inheritedAnalytics, setInheritedAnalytics] = useState<LpAnalyticsConfig | undefined>(undefined);
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

  useEffect(() => {
    fetch("/api/clients").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        // API returns a plain array
        setClients(Array.isArray(data) ? data : (data.clients ?? []));
      }
    }).catch(() => {});
    fetch("/api/tools/landing-pages/templates").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setTemplates(data.templates ?? []);
      }
    }).catch(() => {});
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
        body: JSON.stringify({ name: newClientName.trim(), website: newClientWebsite.trim() || undefined }),
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
        const res = await fetch("/api/tools/landing-pages/upload-image", { method: "POST", body: fd });
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

  const handleGenerate = async () => {
    if (!title || !url || !brief) {
      setError("Please fill in the title, website URL, and brief.");
      return;
    }
    setLoading(true);
    setError(null);

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
          targetAudience: targetAudience || undefined,
          templateId: templateId || undefined,
          analyticsConfig: Object.keys(analyticsConfig).length > 0 ? analyticsConfig : undefined,
          additionalImageUrls: uploadedImages.length > 0 ? uploadedImages.map((i) => i.url) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Generation failed");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Optionally persist this config as the client's default for future LPs
      if (saveAsClientDefault && clientId && Object.keys(analyticsConfig).length > 0) {
        fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultAnalyticsConfig: analyticsConfig }),
        }).catch(() => {});
      }

      router.push(`/tools/landing-pages/${data.landingPage.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <>
    <div className="page" style={{ maxWidth: 720 }}>
      <ClientBackLink />
      {/* Back link */}
      <Link
        href="/tools/landing-pages"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 16, textDecoration: "none" }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to landing pages
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Create Landing Page</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            Provide a website to scrape for branding and a brief — Meridian will generate an optimised LP
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFunMode((v) => !v)}
          title={funMode ? "Disable chaos mode" : "Enable chaos mode 🔥"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 10px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 600,
            border: `1px solid ${funMode ? "var(--accent)" : "var(--border)"}`,
            background: funMode ? "var(--accent-bg)" : "var(--surface)",
            color: funMode ? "var(--accent)" : "var(--text-3)",
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginTop: 2,
            transition: "all 0.15s",
          }}
        >
          <Zap style={{ width: 13, height: 13 }} />
          {funMode ? "Chaos ON" : "Chaos mode"}
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Client selection */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Client <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
              </label>
              {!showNewClient && (
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, fontFamily: "inherit" }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> New client
                </button>
              )}
            </div>

            {showNewClient ? (
              <div style={{ border: "1px solid var(--accent)", borderRadius: "var(--r)", padding: "14px 16px", background: "var(--accent-bg)", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", margin: 0 }}>New client</p>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name *"
                  style={inputStyle}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateClient(); if (e.key === "Escape") setShowNewClient(false); }}
                />
                <input
                  type="url"
                  value={newClientWebsite}
                  onChange={(e) => setNewClientWebsite(e.target.value)}
                  placeholder="Website (optional, e.g. https://example.com)"
                  style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateClient(); if (e.key === "Escape") setShowNewClient(false); }}
                />
                {clientError && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{clientError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={creatingClient || !newClientName.trim()}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r)", fontSize: 13, fontWeight: 600, cursor: creatingClient ? "not-allowed" : "pointer", opacity: creatingClient ? 0.7 : 1, fontFamily: "inherit" }}
                  >
                    {creatingClient ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}
                    {creatingClient ? "Creating…" : "Create & select"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewClient(false); setNewClientName(""); setNewClientWebsite(""); setClientError(null); }}
                    style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, cursor: "pointer", color: "var(--text-2)", fontFamily: "inherit" }}
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
                  <option key={c.id} value={c.id}>{c.name}</option>
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
              <Globe style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-3)", pointerEvents: "none" }} />
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

          {/* Campaign type */}
          <div>
            <label style={labelStyle}>Campaign Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {CAMPAIGN_TYPES.map((type) => {
                const active = campaignType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setCampaignType(type.value)}
                    style={{
                      textAlign: "left" as const, padding: "10px 14px",
                      border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: "var(--r)",
                      background: active ? "var(--accent-bg)" : "var(--surface)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--accent)" : "var(--text)" }}>{type.label}</span>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{type.description}</p>
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

          {/* Target audience */}
          <div>
            <label style={labelStyle}>
              Target Audience <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Parents of children aged 14-19 in the UK"
              style={inputStyle}
            />
          </div>

          {/* Reference images */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Reference Images <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: uploadingImage ? "not-allowed" : "pointer", padding: 0, fontWeight: 600, fontFamily: "inherit", opacity: uploadingImage ? 0.6 : 1 }}
              >
                {uploadingImage ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 13, height: 13 }} />}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, marginBottom: 8 }}>
                {uploadedImages.map((img, i) => (
                  <div
                    key={i}
                    style={{ position: "relative", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "1", background: "var(--bg)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.filename}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
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
                  style={{ border: "1.5px dashed var(--border)", borderRadius: "var(--r)", background: "transparent", cursor: uploadingImage ? "not-allowed" : "pointer", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--text-3)" }}
                >
                  {uploadingImage ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 18, height: 18 }} />}
                  <span style={{ fontSize: 10 }}>Add more</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                style={{ width: "100%", padding: "18px 16px", border: "1.5px dashed var(--border)", borderRadius: "var(--r)", background: "transparent", cursor: uploadingImage ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text-3)", transition: "border-color 0.15s" }}
              >
                <ImageIcon style={{ width: 22, height: 22 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{uploadingImage ? "Uploading…" : "Upload images for Claude to use"}</span>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>Product photos, team shots, campaign imagery — supplements scraped site images</span>
              </button>
            )}
            {imageUploadError && (
              <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{imageUploadError}</p>
            )}
          </div>

          {/* Template selection */}
          {templates.length > 0 && (
            <div>
              <label style={labelStyle}>
                Start from Template <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                <button
                  onClick={() => setTemplateId("")}
                  style={{
                    textAlign: "left" as const, padding: "10px 14px",
                    border: !templateId ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    background: !templateId ? "var(--accent-bg)" : "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: !templateId ? "var(--accent)" : "var(--text)" }}>
                    <Sparkles style={{ width: 13, height: 13 }} /> AI Freestyle
                  </span>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Generate from scratch</p>
                </button>
                {templates.map((t) => {
                  const active = templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      style={{
                        textAlign: "left" as const, padding: "10px 14px",
                        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--r)",
                        background: active ? "var(--accent-bg)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: active ? "var(--accent)" : "var(--text)" }}>
                        {t.isBuiltIn ? <Grid3X3 style={{ width: 13, height: 13 }} /> : <FileText style={{ width: 13, height: 13 }} />}
                        {t.name}
                      </span>
                      {t.description && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</p>}
                      <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--border-subtle)", color: "var(--text-3)" }}>
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
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-3)", marginTop: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={saveAsClientDefault}
                  onChange={(e) => setSaveAsClientDefault(e.target.checked)}
                />
                Also save as the default for {clients.find((c) => c.id === clientId)?.name ?? "this client"}
              </label>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", color: "var(--danger-text)", fontSize: 13 }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--danger-text)" }}><X style={{ width: 14, height: 14 }} /></button>
            </div>
          )}

          {/* Generate button */}
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || !title || !url || !brief}
            style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                {funMode ? "MERIDIAN IS GOING ABSOLUTELY FERAL..." : "Generating with Meridian..."}
              </>
            ) : (
              <>
                <Sparkles style={{ width: 16, height: 16 }} />
                Generate Landing Page
                <ChevronRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>

          {loading && (
            <GenerationProgress
              active={loading}
              message={funMode ? "MERIDIAN HAS BEEN UNLEASHED 🔥" : "Generating with Meridian…"}
              tips={
                funMode
                  ? [
                      "SCRAPING YOUR WHOLE IDENTITY LIKE A RAVENOUS BRAND GREMLIN 🔥🔥🔥",
                      "MERIDIAN IS EATING YOUR BRIEF AND ASKING FOR MORE. THERES NO GOING BACK.",
                      "COMPOSING HEADLINES WITH SUCH UNHINGED ENERGY THE HTML IS CRYING",
                      "THE CTA IS SO GOOD I AM HAVING A MOMENT. A REAL ONE.",
                      "YOUR LANDING PAGE IS BEING FORGED IN THE FIRES OF AI CHAOS. STAY WITH ME.",
                    ]
                  : [
                      "Scraping your website for brand identity…",
                      "Analysing your brief and structuring the page…",
                      "Drafting headlines, copy, and CTA hierarchy…",
                      "Composing the final HTML — this can take 30–60 seconds.",
                    ]
              }
              estimatedSeconds={50}
            />
          )}
        </div>
      </div>
    </div>

    {/* Chaos overlay */}
    <LpChaosOverlay active={funMode && loading} />
  </>
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

function useLpUwu(active: boolean): string {
  const [msg, setMsg] = useState(LP_UWU_MESSAGES[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const shuffled = [...LP_UWU_MESSAGES].sort(() => Math.random() - 0.5);
    indexRef.current = 0;
    const first = setTimeout(() => setMsg(shuffled[0]), 0);
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % shuffled.length;
      setMsg(shuffled[indexRef.current]);
    }, 1800); // faster than Grand Plan (2800ms)
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);

  return msg;
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
    osc.type = (["square", "sawtooth", "triangle"] as OscillatorType[])[Math.floor(Math.random() * 3)];
    osc2.type = "sawtooth";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
    osc2.stop(ctx.currentTime + 0.14);
    osc.onended = () => ctx.close();
  } catch { /* AudioContext blocked — silent fail */ }
}

function LpChaosOverlay({ active }: { active: boolean }) {
  const uwuMsg = useLpUwu(active);
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
      timeoutId = setTimeout(() => {
        playLpChaosBleep();
        scheduleNext();
      }, 400 + Math.random() * 500); // 400–900ms (vs 600–1800ms in Grand Plan)
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
      "✨","💖","🌸","⭐","🎀","💫","🦄","🌈","😻","💕","🎪","🚀",
      "📊","📈","🎯","💅","✌️","🔥","👑","🎉","💣","🤯","🫠","😱",
      "UwU","OwO",">.<",":3","rawr","xD","nyan~","BAKA","brrrr",
      "404","ERROR","NaN","null","undefined","😈","🧨","💥","🌊",
      "CTR","CTA","H1","div","px","rem","vw","vh","HTML","CSS",
      "CONVERT","CLICK","BOUNCE","SCROLL","FUNNEL","🎨","🖼️","💻",
      "W","T","F","LOL","HELP","WHY","HOW","YES","NO","???","!!!",
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
        }))
      );
    }, 150); // 150ms (vs 300ms in Grand Plan)
    return () => clearInterval(id);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}
    >
      {/* UwU status message */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
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
            filter: p.size > 30
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
