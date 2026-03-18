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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">
          All performance reports across your clients
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-800 font-semibold">No reports yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Go to a client and create your first report
          </p>
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            Browse clients
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500">
                  Report
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500">
                  Client
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500">
                  Period
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500">
                  Screenshots
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-slate-50 transition"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-800">{report.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/clients/${report.client.slug}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                    >
                      {report.client.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{report.period}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        report.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-slate-400">
                      {report._count.screenshots}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/reports/${report.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
                    >
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
