import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Users, FileText, TrendingUp, ArrowRight, Plus, Search, BarChart2, AlertTriangle, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

const SEVERITY_COLOUR: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#10b981",
};

export default async function DashboardPage() {
  const session = await getSession();

  const [
    clients,
    totalClients,
    totalReports,
    recentReports,
    inProgressCount,
    latestSignals,
    metaCount, gadsCount, ga4Count, semrushCount, scCount,
  ] = await Promise.all([
    prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { reports: true } } },
    }),
    prisma.client.count(),
    prisma.report.count(),
    prisma.report.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { client: { select: { name: true, slug: true } } },
    }),
    prisma.report.count({ where: { status: { in: ["draft", "review"] } } }),
    prisma.detectedAnomaly.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true, slug: true } } },
    }),
    prisma.client.count({ where: { metaAccountId: { not: null } } }),
    prisma.client.count({ where: { googleAdsCustomerId: { not: null } } }),
    prisma.client.count({ where: { ga4PropertyId: { not: null } } }),
    prisma.client.count({ where: { semrushDomain: { not: null } } }),
    prisma.client.count({ where: { searchConsoleSiteUrl: { not: null } } }),
  ]);

  const activeIntegrationLabels = [
    metaCount > 0 ? `Meta (${metaCount})` : null,
    gadsCount > 0 ? `Google Ads (${gadsCount})` : null,
    ga4Count > 0 ? `GA4 (${ga4Count})` : null,
    semrushCount > 0 ? `SemRush (${semrushCount})` : null,
    scCount > 0 ? `Search Console (${scCount})` : null,
  ].filter(Boolean) as string[];
  const activeIntegrationCount = activeIntegrationLabels.length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 52 }}>
        <h1 className="page-title">
          Welcome back, {session?.user.name ?? "there"} 👋
        </h1>
        <p className="page-desc">Here&apos;s an overview of your clients and recent activity</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Total Clients</p>
            <div className="stat-card-icon" style={{ background: "var(--accent-bg)" }}>
              <Users style={{ width: 20, height: 20, color: "var(--accent)" }} />
            </div>
          </div>
          <p className="stat-card-value">{totalClients}</p>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Total Reports</p>
            <div className="stat-card-icon" style={{ background: "var(--info-bg, #eff6ff)" }}>
              <FileText style={{ width: 20, height: 20, color: "var(--info, #3b82f6)" }} />
            </div>
          </div>
          <p className="stat-card-value">{totalReports}</p>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Active Integrations</p>
            <div className="stat-card-icon" style={{ background: "var(--success-bg)" }}>
              <TrendingUp style={{ width: 20, height: 20, color: "var(--success)" }} />
            </div>
          </div>
          <p className="stat-card-value">{activeIntegrationCount}</p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, lineHeight: 1.5 }}>
            {activeIntegrationLabels.join(" · ") || "None configured"}
          </p>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">In Progress</p>
            <div className="stat-card-icon" style={{ background: "var(--warning-bg, #fffbeb)" }}>
              <Clock style={{ width: 20, height: 20, color: "var(--warning)" }} />
            </div>
          </div>
          <p className="stat-card-value">{inProgressCount}</p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>Draft or in review</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Clients */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Clients</h2>
            <Link href="/clients/new" className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
              <Plus style={{ width: 14, height: 14 }} />
              Add client
            </Link>
          </div>
          <div>
            {clients.length === 0 ? (
              <EmptyState
                icon={<Users style={{ width: 24, height: 24 }} />}
                title="No clients yet"
                description="Add your first client to start tracking their marketing performance."
                actions={[{ label: "Add your first client", href: "/clients/new" }]}
              />
            ) : (
              clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.slug}`}
                  className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-subtle)] no-underline transition-colors hover:bg-[var(--border-subtle)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }} title={client.name}>{client.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {client._count.reports} report{client._count.reports !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)", flexShrink: 0 }} />
                </Link>
              ))
            )}
          </div>
          {clients.length > 0 && (
            <div style={{ padding: "14px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--border-subtle)" }}>
              <Link href="/clients" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", textDecoration: "none" }}>
                View all clients →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Reports</h2>
            <Link href="/reports" className="btn btn-ghost btn-sm">All reports</Link>
          </div>
          <div>
            {recentReports.length === 0 ? (
              <EmptyState
                icon={<FileText style={{ width: 24, height: 24 }} />}
                title="No reports yet"
                description="Select a client and create your first report."
                actions={[{ label: "View clients", href: "/clients", variant: "secondary" }]}
              />
            ) : (
              recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-subtle)] no-underline transition-colors hover:bg-[var(--border-subtle)]"
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{report.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      {report.client.name} · {report.period}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={report.status === "published" ? "badge badge-green" : report.status === "review" ? "badge badge-blue" : "badge badge-slate"}>
                      {report.status}
                    </span>
                    <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                  </div>
                </Link>
              ))
            )}
          </div>
          {recentReports.length > 0 && (
            <div style={{ padding: "14px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--border-subtle)" }}>
              <Link href="/reports" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", textDecoration: "none" }}>
                View all reports →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Latest Signals */}
      {latestSignals.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h2 className="card-title">Latest Signals</h2>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Unresolved anomalies across all clients</span>
          </div>
          <div>
            {latestSignals.map((signal) => (
              <Link
                key={signal.id}
                href={`/clients/${signal.client.slug}`}
                className="flex items-start gap-4 px-7 py-4 border-b border-[var(--border-subtle)] no-underline transition-colors hover:bg-[var(--border-subtle)]"
              >
                <AlertTriangle
                  style={{ width: 15, height: 15, color: SEVERITY_COLOUR[signal.severity] ?? "var(--warning)", flexShrink: 0, marginTop: 1 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                    {signal.client.name}
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-3)", marginLeft: 8 }}>{signal.platform} · {signal.metric}</span>
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {signal.detail}
                  </p>
                </div>
                <span className={`badge badge-${signal.severity === "high" ? "red" : signal.severity === "medium" ? "orange" : "green"}`} style={{ flexShrink: 0, marginTop: 1 }}>
                  {signal.severity}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            <Link href="/clients/new" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]">
              <Users style={{ width: 20, height: 20, color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Add Client</span>
            </Link>
            <Link href="/tools/keyword-planner" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[var(--info,#3b82f6)] hover:bg-[var(--info-bg,#eff6ff)]">
              <Search style={{ width: 20, height: 20, color: "var(--info, #3b82f6)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Keyword Planner</span>
            </Link>
            <Link href="/tools/proposals" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[var(--success)] hover:bg-[var(--success-bg)]">
              <FileText style={{ width: 20, height: 20, color: "var(--success)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Proposals</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]">
              <BarChart2 style={{ width: 20, height: 20, color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>All Reports</span>
            </Link>
            <Link href="/portfolio" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[var(--warning)] hover:bg-[var(--warning-bg,#fffbeb)]">
              <TrendingUp style={{ width: 20, height: 20, color: "var(--warning)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Portfolio</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
