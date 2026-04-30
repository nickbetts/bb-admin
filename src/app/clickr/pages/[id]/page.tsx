"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  publicSlug?: string;
  status: string;
  viewCount: number;
  currentHtml: string;
  briefJson: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClickrPageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/clickr/auth/me");
      if (!meRes.ok) {
        router.replace("/clickr/login");
        return;
      }
      const pageRes = await fetch(`/api/tools/landing-pages/${id}`);
      if (!pageRes.ok) {
        router.replace("/clickr/dashboard");
        return;
      }
      const data = await pageRes.json() as { landingPage: LandingPage };
      setPage(data.landingPage);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function copyPublicUrl() {
    if (!page?.publicSlug) return;
    const url = `${window.location.origin}/lp/${page.publicSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  if (!page) return null;

  const brief = (() => {
    try { return JSON.parse(page.briefJson) as { url?: string; brief?: string; campaignType?: string }; }
    catch { return {}; }
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", color: "#fff" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
        <Link href="/clickr/dashboard" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", textDecoration: "none" }}>
          click<span style={{ color: "#f97316" }}>r</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{page.title}</span>
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>{page.title}</h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              {page.status} · {page.viewCount} view{page.viewCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {page.publicSlug && (
              <button
                onClick={copyPublicUrl}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer" }}
              >
                {copied ? "✓ Copied" : "Copy live URL"}
              </button>
            )}
            <Link href="/clickr/pages/new" style={{ background: "#f97316", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              + New page
            </Link>
          </div>
        </div>

        {/* Brief summary */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Brief</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {brief.url && <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Source URL</span><br /><span style={{ fontSize: 13 }}>{brief.url}</span></div>}
            {brief.campaignType && <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Campaign type</span><br /><span style={{ fontSize: 13 }}>{brief.campaignType}</span></div>}
            {brief.brief && <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Brief</span><br /><span style={{ fontSize: 13 }}>{brief.brief}</span></div>}
          </div>
        </div>

        {/* Preview */}
        {page.publicSlug ? (
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>●</span>
              <span>clickr.marketing/lp/{page.publicSlug}</span>
              <a href={`/lp/${page.publicSlug}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "#f97316", textDecoration: "none", fontSize: 12 }}>Open ↗</a>
            </div>
            <iframe
              src={`/lp/${page.publicSlug}?test=1`}
              style={{ width: "100%", height: 600, border: "none", background: "#fff" }}
              title={page.title}
            />
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              This page hasn&apos;t been published yet.
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              Use the Stratos dashboard to publish and assign a public URL.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
