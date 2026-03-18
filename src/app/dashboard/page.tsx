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
    <div className="p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900">
          {greeting()}, {session?.user.name ?? "there"} 👋
        </h1>
        <p className="text-slate-500 mt-2 text-base">
          Here&apos;s an overview of your clients and recent activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Total Clients</p>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalClients}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Total Reports</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalReports}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Active Integrations</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">3</p>
          <p className="text-xs text-slate-400 mt-1">SemRush · GA4 · Meta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Clients</h2>
            <Link
              href="/clients/new"
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add client
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-500 text-sm">No clients yet</p>
                <Link
                  href="/clients/new"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
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
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {client._count.reports} report
                        {client._count.reports !== 1 ? "s" : ""}
                        {client.semrushDomain && ` · ${client.semrushDomain}`}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition" />
                </Link>
              ))
            )}
          </div>
          {clients.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/clients"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                View all clients →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Reports</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReports.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-500 text-sm">No reports yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select a client and create a report
                </p>
              </div>
            ) : (
              recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {report.client.name} · {report.period}
                    </p>
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
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/clients/new"
            className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-center"
          >
            <Users className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-medium text-slate-600">Add Client</span>
          </Link>
          <Link
            href="/clients"
            className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition text-center"
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-slate-600">New Report</span>
          </Link>
          <Link
            href="/clients"
            className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition text-center"
          >
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-medium text-slate-600">View Analytics</span>
          </Link>
          <Link
            href="/reports"
            className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition text-center"
          >
            <FileText className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-medium text-slate-600">Export PDF</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
