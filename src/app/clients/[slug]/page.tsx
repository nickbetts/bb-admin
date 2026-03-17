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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-500/20">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-400 transition mt-0.5"
                >
                  {client.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/clients/${slug}/report/new`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition"
            >
              <Plus className="h-4 w-4" />
              New Report
            </Link>
            <Link
              href={`/clients/${slug}/settings`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Integration badges */}
        <div className="flex flex-wrap gap-2 mt-6">
          {client.semrushDomain ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              SemRush · {client.semrushDomain}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
              SemRush not configured
            </span>
          )}
          {client.ga4PropertyId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              GA4 · {client.ga4PropertyId}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
              GA4 not configured
            </span>
          )}
          {client.metaAccountId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Meta Ads · {client.metaAccountId}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
              Meta Ads not configured
            </span>
          )}
          {client.googleAdsCustomerId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Google Ads · {client.googleAdsCustomerId}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
              Google Ads not configured
            </span>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <ClientDashboard client={client} period={period} />

      {/* Recent Reports */}
      {client.reports.length > 0 && (
        <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Recent Reports</h2>
            <Link
              href={`/clients/${slug}/report/new`}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              + New report
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {client.reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition group"
              >
                <div>
                  <p className="text-sm font-medium text-white">{report.title}</p>
                  <p className="text-xs text-slate-400">{report.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      report.status === "published"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
