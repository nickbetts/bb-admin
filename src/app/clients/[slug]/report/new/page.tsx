"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

const PERIODS = [
  "January 2025",
  "February 2025",
  "March 2025",
  "April 2025",
  "May 2025",
  "June 2025",
  "July 2025",
  "August 2025",
  "September 2025",
  "October 2025",
  "November 2025",
  "December 2025",
  "Q1 2025",
  "Q2 2025",
  "Q3 2025",
  "Q4 2025",
];

export default function NewReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    period: PERIODS[new Date().getMonth()],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First get the client by fetching all clients and finding by slug
      const clientsRes = await fetch("/api/clients");
      const clients = await clientsRes.json();
      const client = clients.find((c: { slug: string }) => c.slug === slug);

      if (!client) {
        setError("Client not found");
        return;
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          title: form.title,
          period: form.period,
        }),
      });

      if (res.ok) {
        const report = await res.json();
        router.push(`/reports/${report.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/clients/${slug}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create New Report</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate a performance report with live data
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Monthly Performance Report"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reporting Period <span className="text-red-500">*</span>
            </label>
            <select
              value={form.period}
              onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition text-sm shadow-sm"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {loading ? "Creating..." : "Create Report"}
          </button>
          <Link
            href={`/clients/${slug}`}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
