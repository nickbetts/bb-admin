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
      <div className="mb-10">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition mt-0.5"
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Report
            </Link>
            <Link
              href={`/clients/${slug}/settings`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Integration badges */}
        <div className="flex flex-wrap gap-2 mt-6">
          {client.semrushDomain ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              SemRush · {client.semrushDomain}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              SemRush not configured
            </span>
          )}
          {client.ga4PropertyId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              GA4 · {client.ga4PropertyId}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              GA4 not configured
            </span>
          )}
          {client.metaAccountId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Meta Ads · {client.metaAccountId}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              Meta Ads not configured
            </span>
          )}
          {client.googleAdsCustomerId ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Google Ads · {client.googleAdsCustomerId}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              Google Ads not configured
            </span>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <ClientDashboard client={client} period={period} />

      {/* Recent Reports */}
      {client.reports.length > 0 && (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Reports</h2>
            <Link
              href={`/clients/${slug}/report/new`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              + New report
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {client.reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{report.title}</p>
                  <p className="text-xs text-slate-400">{report.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      report.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
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
