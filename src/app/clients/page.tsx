import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus, ArrowRight, Globe, Search } from "lucide-react";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reports: true } } },
  });

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Manage your agency clients and their integrations
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Link>
      </div>

      {/* Client grid */}
      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-slate-800 font-semibold mb-2">No clients yet</h3>
          <p className="text-slate-500 text-sm mb-5">
            Add your first client to start building performance dashboards
          </p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md shadow-indigo-500/20">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 font-semibold truncate group-hover:text-indigo-700 transition">
                    {client.name}
                  </h3>
                  {client.website && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <Globe className="h-3 w-3 shrink-0" />
                      {client.website.replace(/^\/\/https?:\/\//, "")}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition shrink-0 mt-1" />
              </div>

              {/* Integration badges */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {client.semrushDomain && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    SemRush
                  </span>
                )}
                {client.ga4PropertyId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    GA4
                  </span>
                )}
                {client.metaAccountId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Meta Ads
                  </span>
                )}
                {!client.semrushDomain && !client.ga4PropertyId && !client.metaAccountId && (
                  <span className="text-xs text-slate-400">No integrations</span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {client._count.reports} report{client._count.reports !== 1 ? "s" : ""}
                </span>
                <Search className="h-3.5 w-3.5 text-slate-300" />
              </div>
            </Link>
          ))}

          {/* Add new client card */}
          <Link
            href="/clients/new"
            className="rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Plus className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">Add new client</p>
          </Link>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}
