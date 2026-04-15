import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Plus, ExternalLink, Settings, Shield } from "lucide-react";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

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

  // Backfill missing account names from APIs (runs once per client, then cached in DB)
  const backfills: Promise<void>[] = [];
  if (client.metaAccountId && !client.metaAccountName && process.env.META_ACCESS_TOKEN) {
    backfills.push(
      fetch(`https://graph.facebook.com/v19.0/act_${client.metaAccountId}?fields=name&access_token=${process.env.META_ACCESS_TOKEN}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.name) {
            client.metaAccountName = data.name;
            return prisma.client.update({ where: { id: client.id }, data: { metaAccountName: data.name } }).then(() => {});
          }
        })
        .catch(() => {})
    );
  }
  if (client.googleAdsCustomerId && !client.googleAdsAccountName) {
    // Google Ads name backfill would go here if needed
  }
  if (backfills.length) await Promise.all(backfills);

  return (
    <div className="page">
      {/* Back link + header */}
      <div style={{ marginBottom: 40 }}>
      <Breadcrumb className="mb-7" />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 28, fontWeight: 700, flexShrink: 0, boxShadow: "0 8px 24px rgb(99 102 241 / 0.25)" }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title">{client.name}</h1>
              {client.status === "lead" && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "rgba(245,158,11,0.12)", color: "#d97706", display: "inline-block", marginTop: 4 }}>LEAD</span>
              )}
              {client.status === "lost" && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "rgba(100,116,139,0.12)", color: "#64748b", display: "inline-block", marginTop: 4 }}>LOST</span>
              )}
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
            <Link href={`/clients/${slug}/portal`} className="btn btn-secondary">
              <Shield style={{ width: 15, height: 15 }} />
              Portal
            </Link>
          </div>
        </div>

        {/* Integration badges — hidden for leads */}
        {client.status !== "lead" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
          {client.semrushDomain ? (
            <span className="badge badge-orange" style={{ padding: "6px 14px", fontSize: 13 }} title={`SemRush: ${client.semrushDomain}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--channel-semrush)", display: "inline-block" }} />
              SemRush · {client.semrushDomain}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }} title="SemRush not configured">SemRush not configured</span>
          )}
          {client.ga4PropertyId ? (
            <span className="badge badge-blue" style={{ padding: "6px 14px", fontSize: 13 }} title={`GA4: ${client.ga4PropertyName ?? client.ga4PropertyId}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--channel-google_ads)", display: "inline-block" }} />
              GA4 · {client.ga4PropertyName ?? client.ga4PropertyId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }} title="GA4 not configured">GA4 not configured</span>
          )}
          {client.metaAccountId ? (
            <span className="badge badge-indigo" style={{ padding: "6px 14px", fontSize: 13 }} title={`Meta Ads: ${client.metaAccountName ?? client.metaAccountId}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--channel-meta)", display: "inline-block" }} />
              Meta Ads · {client.metaAccountName ?? client.metaAccountId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }} title="Meta Ads not configured">Meta Ads not configured</span>
          )}
          {client.googleAdsCustomerId ? (
            <span className="badge badge-green" style={{ padding: "6px 14px", fontSize: 13 }} title={`Google Ads: ${client.googleAdsAccountName ?? client.googleAdsCustomerId}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              Google Ads · {client.googleAdsAccountName ?? client.googleAdsCustomerId}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }} title="Google Ads not configured">Google Ads not configured</span>
          )}
          {client.searchConsoleSiteUrl ? (
            <span className="badge badge-purple" style={{ padding: "6px 14px", fontSize: 13 }} title={`Search Console: ${client.searchConsoleSiteUrl}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--channel-search_console)", display: "inline-block" }} />
              Search Console · {client.searchConsoleSiteUrl.replace(/^https?:\/\//, "").replace(/^sc-domain:/, "").replace(/\/$/, "")}
            </span>
          ) : (
            <span className="badge badge-slate" style={{ padding: "6px 14px", fontSize: 13 }} title="Search Console not configured">Search Console not configured</span>
          )}
        </div>
        )}
      </div>

      {/* Dashboard tabs */}
      <ClientDashboard client={client} period={period} userRole={session.user.role} permissions={session.user.permissions} />

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
                className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-subtle)] no-underline transition-colors hover:bg-[var(--border-subtle)]"
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
