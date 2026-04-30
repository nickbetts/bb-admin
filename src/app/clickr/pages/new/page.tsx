"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CAMPAIGN_TYPES = [
  { value: "lead_generation", label: "Lead generation" },
  { value: "product_launch", label: "Product launch" },
  { value: "event", label: "Event / webinar" },
  { value: "ebook_download", label: "eBook / download" },
  { value: "ecommerce", label: "eCommerce / offer" },
  { value: "service_promo", label: "Service promotion" },
];

export default function ClickrNewPagePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [campaignType, setCampaignType] = useState("lead_generation");
  const [targetAudience, setTargetAudience] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/clickr/auth/me").then(r => {
      if (!r.ok) router.replace("/clickr/login");
      else setAuthed(true);
    }).catch(() => router.replace("/clickr/login"))
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUpgradeRequired(false);
    setGenerating(true);
    setStatus("Starting generation…");

    try {
      const res = await fetch("/api/tools/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, brief, campaignType, targetAudience }),
      });

      if (res.status === 402) {
        const data = await res.json() as { error: string };
        setError(data.error);
        setUpgradeRequired(true);
        setGenerating(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Generation failed");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let newPageId: string | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const event = JSON.parse(line) as { type: string; message?: string; landingPage?: { id: string }; error?: string };
              if (event.type === "progress" && event.message) setStatus(event.message);
              if (event.type === "done" && event.landingPage) newPageId = event.landingPage.id;
              if (event.type === "error") setError(event.error ?? "Generation failed");
            } catch { /* ignore parse errors */ }
          }
        }
      }

      if (newPageId) router.push(`/clickr/pages/${newPageId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setGenerating(false);
    }
  }

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#09090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</div>
    </div>
  );
  if (!authed) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", color: "#fff" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
        <Link href="/clickr/dashboard" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", textDecoration: "none" }}>
          click<span style={{ color: "#f97316" }}>r</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>New page</span>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Create a landing page</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 36 }}>
          Tell the AI about your campaign and it will generate a high-converting page for you.
        </p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 24 }}>
            {error}
            {upgradeRequired && (
              <div style={{ marginTop: 10 }}>
                <Link href="/clickr/pricing" style={{ background: "#f97316", borderRadius: 6, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Upgrade plan
                </Link>
              </div>
            )}
          </div>
        )}

        {generating && !error && (
          <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "12px 16px", color: "#fdba74", fontSize: 14, marginBottom: 24 }}>
            {status ?? "Working…"}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Page title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale — 30% Off All Plans"
              required
              disabled={generating}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Your website URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-website.com"
              required
              disabled={generating}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Used to extract your brand colours, fonts, and imagery.</div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Campaign type</label>
            <select
              value={campaignType}
              onChange={e => setCampaignType(e.target.value)}
              disabled={generating}
              style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            >
              {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Brief</label>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder="Describe what you want to promote, your key selling points, and any specific copy or offers to include…"
              required
              rows={5}
              disabled={generating}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Target audience <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>(optional)</span></label>
            <input
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="e.g. Small business owners aged 30–50 looking for…"
              disabled={generating}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            style={{ background: generating ? "rgba(249,115,22,0.5)" : "#f97316", border: "none", borderRadius: 8, padding: "13px 20px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer" }}
          >
            {generating ? status ?? "Generating…" : "Generate landing page"}
          </button>
        </form>
      </div>
    </div>
  );
}
