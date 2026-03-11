import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FileText, ArrowRight } from "lucide-react";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true, slug: true } },
      _count: { select: { sections: true, screenshots: true } },
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">
          All performance reports across your clients
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-white font-medium">No reports yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Go to a client and create your first report
          </p>
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm transition"
          >
            Browse clients
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                  Report
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                  Client
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                  Period
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">
                  Screenshots
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-slate-800/30 transition"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-white">{report.title}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/clients/${report.client.slug}`}
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                    >
                      {report.client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-300">{report.period}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        report.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs text-slate-400">
                      {report._count.screenshots}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/reports/${report.id}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition"
                    >
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
