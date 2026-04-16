"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Target, MessageSquare, LogOut, Loader2, ExternalLink, Globe, BookOpen, Layers, Map } from "lucide-react";
import Link from "next/link";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  permissions: string;
  client: { id: string; name: string; slug: string; website: string | null; logoUrl: string | null };
}

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  shareToken: string | null;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  metric: string;
  targetValue: number;
  currentValue: number | null;
  unit: string | null;
  targetDate: string;
  status: string;
}

interface Communication {
  id: string;
  type: string;
  subject: string;
  createdAt: string;
  status: string;
}

interface AssetReport {
  id: string;
  title: string;
  period: string;
  shareToken: string;
  createdAt: string;
}

interface AssetLandingPage {
  id: string;
  title: string;
  shareToken: string;
  updatedAt: string;
}

interface AssetContentStrategy {
  id: string;
  title: string;
  period: string;
  shareToken: string;
  createdAt: string;
}

interface AssetProposal {
  id: string;
  title: string;
  clientName: string;
  shareToken: string;
  createdAt: string;
}

interface AssetGrandPlan {
  id: string;
  title: string;
  purpose: string;
  shareToken: string;
  createdAt: string;
}

interface PortalAssets {
  reports: AssetReport[];
  landingPages: AssetLandingPage[];
  contentStrategies: AssetContentStrategy[];
  proposals: AssetProposal[];
  grandPlans: AssetGrandPlan[];
}

interface PortalData {
  reports: Report[];
  goals: Goal[];
  communications: Communication[];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [assets, setAssets] = useState<PortalAssets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/me").then((r) => r.ok ? r.json() : null),
      fetch("/api/portal/data").then((r) => r.ok ? r.json() : null),
    ])
      .then(([me, portalData]: [PortalUser | null, PortalData | null]) => {
        if (!me) { router.push("/portal/login"); return; }
        setUser(me);
        setData(portalData);
        // Fetch assets if user has permission
        const perms: string[] = (() => { try { return JSON.parse(me.permissions) as string[]; } catch { return []; } })();
        if (perms.includes("assets")) {
          fetch("/api/portal/assets")
            .then((r) => r.ok ? r.json() : null)
            .then((a: PortalAssets | null) => setAssets(a))
            .catch(() => null);
        }
      })
      .catch(() => router.push("/portal/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/portal/auth", { method: "DELETE" }).catch(() => null);
    router.push("/portal/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--accent)" }} className="animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const permissions: string[] = (() => { try { return JSON.parse(user.permissions) as string[]; } catch { return []; } })();
  const isLeadPortal = permissions.length === 1 && permissions.includes("assets");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo-dark.svg" style={{ height: 22, width: "auto" }} alt="i3media" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{user.client.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{user.name ?? user.email}</span>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
            <LogOut style={{ width: 13, height: 13 }} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ padding: "32px 48px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", marginTop: 4 }}>{isLeadPortal ? "Here\u2019s what we\u2019ve prepared for you" : "Here\u2019s an overview of your marketing performance"}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {/* Reports */}
          {permissions.includes("reports") && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <FileText style={{ width: 16, height: 16, color: "var(--accent)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Recent Reports</h2>
              </div>
              {!data?.reports?.length ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>No reports available yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.reports.slice(0, 4).map((r) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{r.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)" }}>{r.period} · {timeAgo(r.createdAt)}</p>
                      </div>
                      {r.shareToken && (
                        <a href={`/share/report/${r.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5 }}>
                          <ExternalLink style={{ width: 12, height: 12 }} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Goals */}
          {permissions.includes("goals") && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Target style={{ width: 16, height: 16, color: "var(--success)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Active Goals</h2>
              </div>
              {!data?.goals?.length ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>No goals set yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.goals.filter((g) => g.status === "active").slice(0, 4).map((g) => {
                    const pct = g.currentValue != null && g.targetValue > 0
                      ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                      : 0;
                    const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#6366f1";
                    return (
                      <div key={g.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{g.title}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, background: "var(--border)", borderRadius: 99 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Communications */}
          {permissions.includes("communications") && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <MessageSquare style={{ width: 16, height: 16, color: "var(--warning)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Recent Updates</h2>
              </div>
              {!data?.communications?.length ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>No communications logged yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.communications.slice(0, 5).map((c) => (
                    <div key={c.id}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.subject}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>{c.type} · {timeAgo(c.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assets */}
          {permissions.includes("assets") && (
            <div className="card" style={{ padding: 20, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Layers style={{ width: 16, height: 16, color: "var(--accent)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Your Assets</h2>
              </div>
              {!assets || (!assets.reports.length && !assets.landingPages.length && !assets.contentStrategies.length && !assets.proposals.length && !assets.grandPlans?.length) ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>No shared assets available yet.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
                  {/* Published Reports */}
                  {assets.reports.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <FileText style={{ width: 13, height: 13, color: "var(--accent)" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reports</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {assets.reports.map((r) => (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                              <p style={{ fontSize: 11, color: "var(--text-3)" }}>{r.period}</p>
                            </div>
                            <a href={`/share/report/${r.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5, flexShrink: 0 }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Landing Pages */}
                  {assets.landingPages.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <Globe style={{ width: 13, height: 13, color: "#22c55e" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Landing Pages</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {assets.landingPages.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.title}</p>
                            <a href={`/api/share/landing-page/${p.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5, flexShrink: 0 }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Strategies */}
                  {assets.contentStrategies.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <BookOpen style={{ width: 13, height: 13, color: "#f59e0b" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Content Strategies</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {assets.contentStrategies.map((s) => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</p>
                              <p style={{ fontSize: 11, color: "var(--text-3)" }}>{s.period}</p>
                            </div>
                            <a href={`/share/content-strategy/${s.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5, flexShrink: 0 }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proposals */}
                  {assets.proposals.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <FileText style={{ width: 13, height: 13, color: "#6366f1" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Proposals</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {assets.proposals.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.title}</p>
                            <a href={`/share/proposal/${p.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5, flexShrink: 0 }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grand Plans */}
                  {assets.grandPlans?.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <Map style={{ width: 13, height: 13, color: "#0f172a" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Plans</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {assets.grandPlans.map((gp) => (
                          <div key={gp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gp.title}</p>
                              <p style={{ fontSize: 11, color: "var(--text-3)" }}>{gp.purpose === "pitch" ? "Pitch" : gp.purpose === "onboarding" ? "Onboarding" : "Strategy"}</p>
                            </div>
                            <a href={`/share/grand-plan/${gp.shareToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 5, flexShrink: 0 }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
