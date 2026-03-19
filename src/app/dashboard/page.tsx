import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Users, FileText, TrendingUp, ArrowRight, Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { _count: { select: { reports: true } } },
  });
  const totalClients = await prisma.client.count();
  const totalReports = await prisma.report.count();
  const recentReports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { client: { select: { name: true, slug: true } } },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 52 }}>
        <h1 className="page-title">
          {greeting()}, {session?.user.name ?? "there"} 👋
        </h1>
        <p className="page-desc">Here&apos;s an overview of your clients and recent activity</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 40 }}>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Total Clients</p>
            <div className="stat-card-icon" style={{ background: "#eef2ff" }}>
              <Users style={{ width: 20, height: 20, color: "#6366f1" }} />
            </div>
          </div>
          <p className="stat-card-value">{totalClients}</p>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Total Reports</p>
            <div className="stat-card-icon" style={{ background: "#eff6ff" }}>
              <FileText style={{ width: 20, height: 20, color: "#3b82f6" }} />
            </div>
          </div>
          <p className="stat-card-value">{totalReports}</p>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="stat-card-label">Active Integrations</p>
            <div className="stat-card-icon" style={{ background: "#ecfdf5" }}>
              <TrendingUp style={{ width: 20, height: 20, color: "#10b981" }} />
            </div>
          </div>
          <p className="stat-card-value">4</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>SemRush · GA4 · Meta · Google Ads</p>
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
              <div style={{ padding: "40px 28px", textAlign: "center" }}>
                <p style={{ color: "var(--text-3)", fontSize: 14 }}>No clients yet</p>
                <Link href="/clients/new" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: "inline-flex" }}>
                  Add your first client
                </Link>
              </div>
            ) : (
              clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.slug}`}
                  className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-subtle)] no-underline transition-colors hover:bg-[var(--border-subtle)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16, fontWeight: 700 }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{client.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {client._count.reports} report{client._count.reports !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)" }} />
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
          </div>
          <div>
            {recentReports.length === 0 ? (
              <div style={{ padding: "40px 28px", textAlign: "center" }}>
                <p style={{ color: "var(--text-3)", fontSize: 14 }}>No reports yet</p>
                <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 6 }}>Select a client and create a report</p>
              </div>
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
                    <span className={report.status === "published" ? "badge badge-green" : "badge badge-slate"}>
                      {report.status}
                    </span>
                    <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            <Link href="/clients/new" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[#a5b4fc] hover:bg-[#eef2ff]">
              <Users style={{ width: 20, height: 20, color: "#6366f1" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Add Client</span>
            </Link>
            <Link href="/clients" className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-xl border border-[var(--border)] no-underline transition-all hover:border-[#93c5fd] hover:bg-[#eff6ff]">
              <FileText style={{ width: 20, height: 20, color: "#3b82f6" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>New Report</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
