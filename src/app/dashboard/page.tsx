import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  Plus,
  Search,
  BarChart2,
  AlertTriangle,
  Clock,
  Settings,
  AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardStatValue } from "@/components/dashboard/DashboardStatValue";
import { FavouriteToggle } from "@/components/ui/FavouriteToggle";

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
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
    metaCount,
    gadsCount,
    ga4Count,
    semrushCount,
    scCount,
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
      <div className="animate-in" style={{ marginBottom: 40 }}>
        <DashboardGreeting name={session?.user.name ?? "there"} />
        <p className="page-desc">Here&apos;s an overview of your clients and recent activity</p>
      </div>

      {/* Reports needing attention banner */}
      {inProgressCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 20px",
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
            borderRadius: "var(--r)",
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <AlertCircle style={{ width: 16, height: 16, color: "var(--warning)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--warning-text)", flex: 1 }}>
            <strong>
              {inProgressCount} report{inProgressCount !== 1 ? "s" : ""}
            </strong>{" "}
            {inProgressCount === 1 ? "needs" : "need"} attention — currently draft or in review.
          </span>
          <Link
            href="/reports"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--warning)",
              textDecoration: "none",
            }}
          >
            View reports →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div
        className="stat-card-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 36,
        }}
      >
        <div className="stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <p className="stat-card-label">Total Clients</p>
            <div className="stat-card-icon" style={{ background: "var(--accent-bg)" }}>
              <Users style={{ width: 20, height: 20, color: "var(--accent)" }} />
            </div>
          </div>
          <DashboardStatValue value={totalClients} />
        </div>
        <div className="stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <p className="stat-card-label">Total Reports</p>
            <div className="stat-card-icon" style={{ background: "var(--info-bg)" }}>
              <FileText style={{ width: 20, height: 20, color: "var(--info)" }} />
            </div>
          </div>
          <DashboardStatValue value={totalReports} />
        </div>
        <div className="stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <p className="stat-card-label">Active Integrations</p>
            <div className="stat-card-icon" style={{ background: "var(--success-bg)" }}>
              <TrendingUp style={{ width: 20, height: 20, color: "var(--success)" }} />
            </div>
          </div>
          <DashboardStatValue
            value={activeIntegrationCount}
            subtitle={activeIntegrationLabels.join(" · ") || "None configured"}
          />
        </div>
        <div className="stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <p className="stat-card-label">In Progress</p>
            <div className="stat-card-icon" style={{ background: "var(--warning-bg)" }}>
              <Clock style={{ width: 20, height: 20, color: "var(--warning)" }} />
            </div>
          </div>
          <DashboardStatValue value={inProgressCount} subtitle="Draft or in review" />
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 32px",
                    borderBottom: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  className="hover:bg-[var(--border-subtle)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "var(--gradient-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 16,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgb(99 102 241 / 0.25)",
                      }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
                        title={client.name}
                      >
                        {client.name}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {client._count.reports} report{client._count.reports !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <FavouriteToggle id={client.slug} size={14} />
                    <ArrowRight
                      style={{ width: 16, height: 16, color: "var(--text-4)", flexShrink: 0 }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
          {clients.length > 0 && (
            <div
              style={{
                padding: "14px 32px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--border-subtle)",
              }}
            >
              <Link
                href="/clients"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-2)",
                  textDecoration: "none",
                }}
              >
                View all clients →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Reports</h2>
            <Link href="/reports" className="btn btn-ghost btn-sm">
              All reports
            </Link>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 32px",
                    borderBottom: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  className="hover:bg-[var(--border-subtle)]"
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {report.title}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      {report.client.name} · {report.period}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      className={
                        report.status === "published"
                          ? "badge badge-green"
                          : report.status === "review"
                            ? "badge badge-blue"
                            : "badge badge-slate"
                      }
                    >
                      {report.status}
                    </span>
                    <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                  </div>
                </Link>
              ))
            )}
          </div>
          {recentReports.length > 0 && (
            <div
              style={{
                padding: "14px 32px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--border-subtle)",
              }}
            >
              <Link
                href="/reports"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-2)",
                  textDecoration: "none",
                }}
              >
                View all reports →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Latest Signals — always shown, with empty state */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Latest Signals</h2>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            Unresolved anomalies across all clients
          </span>
        </div>
        {latestSignals.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle style={{ width: 24, height: 24 }} />}
            title="No active signals"
            description="All clear — no unresolved anomalies across your client accounts."
          />
        ) : (
          <div>
            {latestSignals.map((signal) => (
              <Link
                key={signal.id}
                href={`/clients/${signal.client.slug}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px 32px",
                  borderBottom: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                className="hover:bg-[var(--border-subtle)]"
              >
                <AlertTriangle
                  style={{
                    width: 15,
                    height: 15,
                    color: SEVERITY_COLOUR[signal.severity] ?? "var(--warning)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}
                  >
                    {signal.client.name}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--text-3)",
                        marginLeft: 8,
                      }}
                    >
                      {signal.platform} · {signal.metric}
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-2)",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {signal.detail}
                  </p>
                </div>
                <span
                  className={`badge badge-${signal.severity === "high" ? "red" : signal.severity === "medium" ? "orange" : "green"}`}
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  {signal.severity}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card animate-in-slow" style={{ marginTop: 28 }}>
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <Link
              href="/clients/new"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 16px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--accent-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                Add Client
              </span>
            </Link>
            <Link
              href="/tools/keyword-planner"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 16px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:border-[var(--info)] hover:bg-[var(--info-bg)]"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--info-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Search style={{ width: 18, height: 18, color: "var(--info)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                Keyword Planner
              </span>
            </Link>
            <Link
              href="/reports"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 16px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--accent-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart2 style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                All Reports
              </span>
            </Link>
            <Link
              href="/portfolio"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 16px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:border-[var(--warning)] hover:bg-[var(--warning-bg)]"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--warning-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp style={{ width: 18, height: 18, color: "var(--warning)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                Portfolio
              </span>
            </Link>
            <Link
              href="/settings"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 16px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:border-[var(--text-3)] hover:bg-[var(--border-subtle)]"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings style={{ width: 18, height: 18, color: "var(--text-3)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                Settings
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
