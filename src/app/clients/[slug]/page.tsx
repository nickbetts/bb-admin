import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ArrowLeft, Plus, ExternalLink, Settings } from "lucide-react";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function ClientPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const { period = "30d" } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { slug },
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="page">
      {/* Back link + header */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/clients" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", fontWeight: 500, textDecoration: "none", marginBottom: 28, transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          All clients
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 28, fontWeight: 700, flexShrink: 0, boxShadow: "0 8px 24px rgb(99 102 241 / 0.25)" }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title">{client.name}</h1>
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginTop: 6 }}>
                  {client.website.replace(/^https?:\/\//, "")}
                  <ExternalLink style={{ width: 11, height: 11 }} />
                </a>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link href={`/clients/${slug}/report/new`} className="btn btn-primary">
              <Plus style={{ width: 16, height: 16 }} />
              New Report
            </Link>
            <Link href={`/clients/${slug}/settings`} className="btn btn-secondary">
              <Settings style={{ width: 15, height: 15 }} />
              Settings
            </Link>
          </div>
        </div>

        {/* Integration badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
          {client.semrushDomain ? (
            <span className="badge badge-orange" style={{ padding: "6px 14px", fontSize: 13 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
              SemRush · {client.semrushDomain}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }}>SemRush not configured</span>
          )}
          {client.ga4PropertyId ? (
            <span className="badge badge-blue" style={{ padding: "6px 14px", fontSize: 13 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              GA4 · {client.ga4PropertyId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }}>GA4 not configured</span>
          )}
          {client.metaAccountId ? (
            <span className="badge badge-indigo" style={{ padding: "6px 14px", fontSize: 13 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
              Meta Ads · {client.metaAccountId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }}>Meta Ads not configured</span>
          )}
          {client.googleAdsCustomerId ? (
            <span className="badge badge-green" style={{ padding: "6px 14px", fontSize: 13 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              Google Ads · {client.googleAdsCustomerId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }}>Google Ads not configured</span>
          )}
        </div>
      </div>

      {/* Dashboard tabs */}
      <ClientDashboard client={client} period={period} />

      {/* Recent Reports */}
      {client.reports.length > 0 && (
        <div className="card" style={{ marginTop: 48 }}>
          <div className="card-header">
            <h2 className="card-title">Recent Reports</h2>
            <Link href={`/clients/${slug}/report/new`} className="btn btn-ghost btn-sm">
              + New report
            </Link>
          </div>
          <div>
            {client.reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid var(--border-subtle)", textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--border-subtle)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{report.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{report.period}</p>
                </div>
                <span className={report.status === "published" ? "badge badge-green" : "badge badge-slate"}>
                  {report.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
