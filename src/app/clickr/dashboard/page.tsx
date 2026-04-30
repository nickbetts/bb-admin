"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/stripe";

interface ClickrUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;
  planStatus: string;
  lpsThisMonth: number;
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  publicSlug?: string;
  createdAt: string;
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "1";

  const [user, setUser] = useState<ClickrUser | null>(null);
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/clickr/auth/me");
        if (!meRes.ok) {
          router.replace("/clickr/login");
          return;
        }
        const meData = await meRes.json() as { user: ClickrUser };
        setUser(meData.user);

        const pagesRes = await fetch("/api/tools/landing-pages");
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json() as { landingPages: LandingPage[] };
          setPages(pagesData.landingPages);
        }
      } catch {
        router.replace("/clickr/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/clickr/auth/logout", { method: "POST" });
    router.push("/clickr/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  const limit = PLAN_LIMITS[user.planTier] ?? 1;
  const limitLabel = limit === Infinity ? "Unlimited" : String(limit);
  const usagePercent = limit === Infinity ? 0 : Math.min(100, (user.lpsThisMonth / limit) * 100);
  const planLabel = user.planTier.charAt(0).toUpperCase() + user.planTier.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", color: "#fff" }}>
      {/* Top nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", textDecoration: "none" }}>
          click<span style={{ color: "#f97316" }}>r</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{user.email}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px" }}>
        {upgraded && (
          <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 18px", color: "#4ade80", fontSize: 14, marginBottom: 28 }}>
            🎉 Your plan has been upgraded successfully. Welcome to {planLabel}!
          </div>
        )}

        {/* Plan overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current plan</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{planLabel}</div>
            <div style={{ fontSize: 12, color: user.planStatus === "active" ? "#4ade80" : "#f87171", marginTop: 4 }}>{user.planStatus}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pages this month</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{user.lpsThisMonth} <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ {limitLabel}</span></div>
            {limit !== Infinity && (
              <div style={{ marginTop: 10, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                <div style={{ width: `${usagePercent}%`, height: "100%", background: usagePercent >= 100 ? "#ef4444" : "#f97316", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total pages</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{pages.length}</div>
            {user.planTier !== "pro" && (
              <Link href="/clickr/pricing" style={{ display: "inline-block", marginTop: 6, fontSize: 12, color: "#f97316", textDecoration: "none" }}>Upgrade →</Link>
            )}
          </div>
        </div>

        {/* Landing pages */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Your landing pages</h2>
          <Link
            href="/clickr/pages/new"
            style={{ background: "#f97316", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
          >
            + New page
          </Link>
        </div>

        {pages.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No landing pages yet</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Create your first AI-powered landing page in minutes.</div>
            <Link href="/clickr/pages/new" style={{ background: "#f97316", borderRadius: 8, padding: "10px 22px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Create your first page
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pages.map((page) => (
              <div key={page.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{page.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {page.status} · {page.viewCount} view{page.viewCount !== 1 ? "s" : ""}
                    {page.publicSlug ? ` · /lp/${page.publicSlug}` : ""}
                  </div>
                </div>
                <Link href={`/clickr/pages/${page.id}`} style={{ fontSize: 13, color: "#f97316", textDecoration: "none", fontWeight: 500 }}>
                  Edit →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClickrDashboardPage() {
  return (
    <Suspense fallback={<div style={{ background: "#09090f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "-apple-system,sans-serif" }}>Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
