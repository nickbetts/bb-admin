import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus, ArrowRight, Globe, Search } from "lucide-react";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reports: true } } },
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-desc">Manage your agency clients and their integrations</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }} />
          Add Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="empty-state-title">No clients yet</h3>
          <p className="empty-state-desc">Add your first client to start building performance dashboards</p>
          <Link href="/clients/new" className="btn btn-primary" style={{ marginTop: 28, display: "inline-flex" }}>
            <Plus style={{ width: 16, height: 16 }} />
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.slug}`} className="client-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div className="client-avatar">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.name}
                  </h3>
                  {client.website && (
                    <p style={{ fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Globe style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {client.website.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)", flexShrink: 0, marginTop: 2 }} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                {client.semrushDomain && <span className="badge badge-orange">SemRush</span>}
                {client.ga4PropertyId && <span className="badge badge-blue">GA4</span>}
                {client.metaAccountId && <span className="badge badge-indigo">Meta Ads</span>}
                {!client.semrushDomain && !client.ga4PropertyId && !client.metaAccountId && (
                  <span style={{ fontSize: 12, color: "var(--text-4)" }}>No integrations</span>
                )}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {client._count.reports} report{client._count.reports !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}

          <Link href="/clients/new" style={{ borderRadius: "var(--r-lg)", border: "2px dashed var(--border)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textDecoration: "none", transition: "all 0.2s", minHeight: 180 }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#a5b4fc"; (e.currentTarget as HTMLAnchorElement).style.background = "#eef2ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLAnchorElement).style.background = ""; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus style={{ width: 20, height: 20, color: "var(--text-3)" }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Add new client</p>
          </Link>
        </div>
      )}
    </div>
  );
}
