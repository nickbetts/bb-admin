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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {session?.user.name ?? "there"} 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s an overview of your clients and recent activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">Total Clients</p>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalClients}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">Total Reports</p>
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalReports}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">Active Integrations</p>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">3</p>
          <p className="text-xs text-slate-500 mt-1">SemRush · GA4 · Meta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Recent Clients</h2>
            <Link
              href="/clients/new"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add client
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {clients.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-slate-400 text-sm">No clients yet</p>
                <Link
                  href="/clients/new"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add your first client
                </Link>
              </div>
            ) : (
              clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.slug}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {client._count.reports} report
                        {client._count.reports !== 1 ? "s" : ""}
                        {client.semrushDomain && ` · ${client.semrushDomain}`}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition" />
                </Link>
              ))
            )}
          </div>
          {clients.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800">
              <Link
                href="/clients"
                className="text-xs text-slate-400 hover:text-white transition"
              >
                View all clients →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Recent Reports</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {recentReports.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-slate-400 text-sm">No reports yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Select a client and create a report
                </p>
              </div>
            ) : (
              recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition group"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {report.client.name} · {report.period}
                    </p>
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
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/clients/new"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition text-center"
          >
            <Users className="h-5 w-5 text-indigo-400" />
            <span className="text-xs text-slate-300">Add Client</span>
          </Link>
          <Link
            href="/clients"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition text-center"
          >
            <FileText className="h-5 w-5 text-blue-400" />
            <span className="text-xs text-slate-300">New Report</span>
          </Link>
          <Link
            href="/clients"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition text-center"
          >
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span className="text-xs text-slate-300">View Analytics</span>
          </Link>
          <Link
            href="/reports"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition text-center"
          >
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="text-xs text-slate-300">Export PDF</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
