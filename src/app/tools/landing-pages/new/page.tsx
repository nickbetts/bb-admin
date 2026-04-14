"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Sparkles,
  FileText,
  Grid3X3,
  ChevronRight,
  X,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  website?: string | null;
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

  useEffect(() => {
    fetch("/api/clients").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setClients(data.clients ?? []);
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Generation failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/tools/landing-pages/${data.landingPage.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      {/* Back link */}
      <Link
        href="/tools/landing-pages"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 16, textDecoration: "none" }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to landing pages
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Create Landing Page</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
          Provide a website to scrape for branding and a brief — Claude will generate an optimised LP
        </p>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Client selection */}
          <div>
            <label style={labelStyle}>
              Client <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
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
                Generating with Claude Sonnet...
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
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)" }}>
              <p>Scraping website for brand identity...</p>
              <p style={{ marginTop: 4 }}>This can take 30–60 seconds for complex pages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
