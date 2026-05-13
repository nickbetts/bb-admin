"use client";

import { useEffect, useState } from "react";

interface CostRow {
  tool?: string;
  provider?: string;
  totalCost: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}

interface CostResponse {
  startDate: string;
  endDate: string;
  groupBy: "tool" | "provider" | "total";
  data: CostRow[];
}

const GROUPS = [
  { value: "tool", label: "Tool" },
  { value: "provider", label: "Provider" },
  { value: "total", label: "Total" },
];

const PERIODS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export default function AICostsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostResponse | null>(null);
  const [groupBy, setGroupBy] = useState<"tool" | "provider" | "total">("tool");
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - period);
        const params = new URLSearchParams({
          groupBy,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        });
        const res = await fetch(`/api/admin/ai-costs?${params}`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [groupBy, period]);

  const totalCost = data?.data.reduce((sum, r) => sum + r.totalCost, 0) ?? 0;
  const totalCalls = data?.data.reduce((sum, r) => sum + r.callCount, 0) ?? 0;
  const totalInput = data?.data.reduce((sum, r) => sum + r.inputTokens, 0) ?? 0;
  const totalOutput = data?.data.reduce((sum, r) => sum + r.outputTokens, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Cost Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor usage and costs across tools and providers</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group by:</label>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as "tool" | "provider" | "total")}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {GROUPS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time period:</label>
              <select
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalCalls.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Input Tokens</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(totalInput/1e3).toFixed(1)}K</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Output Tokens</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(totalOutput/1e3).toFixed(1)}K</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Error: {error}</p>
            </div>
          ) : data && data.data.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {groupBy === "tool" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tool</th>}
                  {groupBy === "provider" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Provider</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Calls</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Input Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Output Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {groupBy === "tool" && <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.tool}</td>}
                    {groupBy === "provider" && <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.provider}</td>}
                    <td className="px-6 py-4 text-sm text-gray-600">{row.callCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(row.inputTokens/1e3).toFixed(1)}K</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(row.outputTokens/1e3).toFixed(1)}K</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">${row.totalCost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600">No data available for the selected period</p>
            </div>
          )}
        </div>
        {data && (
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Showing data from <strong>{new Date(data.startDate).toLocaleDateString()}</strong> to <strong>{new Date(data.endDate).toLocaleDateString()}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
