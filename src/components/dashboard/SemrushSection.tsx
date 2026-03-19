"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/index";
import { LoadingSpinner } from "@/components/ui/index";
import { formatNumber, formatCurrency, formatDateDisplay, pctChange } from "@/lib/utils";
import { TrendingUp, Search, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface SemrushSectionProps {
  domain: string;
  startDate: string;
  endDate: string;
}

interface Overview {
  organicTraffic: number;
  organicKeywords: number;
  organicCost: number;
  paidTraffic: number;
  paidKeywords: number;
  paidCost: number;
}

interface Keyword {
  keyword: string;
  position: number;
  previousPosition: number;
  searchVolume: number;
  cpc: number;
  url: string;
  trafficPercent: number;
}

interface HistoryItem {
  date: string;
  organicKeywords: number;
  organicTraffic: number;
}

interface DistributionItem {
  range: string;
  count: number;
}

const POSITION_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function SemrushSection({ domain, startDate, endDate }: SemrushSectionProps) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, keywordsRes, historyRes, distRes] = await Promise.all([
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=overview`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=keywords`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=history`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=distribution`, { signal: controller.signal }),
        ]);

        if (!overviewRes.ok) {
          const err = await overviewRes.json();
          throw new Error(err.error ?? "Failed to fetch SemRush data");
        }

        const [ov, kw, hist, dist] = await Promise.all([
          overviewRes.json(),
          keywordsRes.json(),
          historyRes.json(),
          distRes.json(),
        ]);

        setOverview(ov);
        setKeywords(Array.isArray(kw) ? kw : []);
        setHistory(Array.isArray(hist) ? hist : []);
        setDistribution(Array.isArray(dist) ? dist : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load SemRush data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [domain, startDate, endDate]);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SEO Performance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Organic traffic data via SEMrush</p>
        </div>
        <span className="text-sm text-slate-400">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading SEMrush data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load SEMrush data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !overview ? null : (
        <>
      {/* Overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <MetricCard
          title="Organic Traffic"
          value={formatNumber(overview.organicTraffic)}
          subtitle="Monthly visits"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicTraffic, history[history.length - 2].organicTraffic) : undefined}
          changeLabel="vs prev month"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Organic Keywords"
          value={formatNumber(overview.organicKeywords)}
          subtitle="Ranking keywords"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicKeywords, history[history.length - 2].organicKeywords) : undefined}
          changeLabel="vs prev month"
          icon={<Search className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Traffic Value"
          value={formatCurrency(overview.organicCost)}
          subtitle="Equivalent PPC value"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Traffic history chart */}
      {history.length > 0 && (
        <SectionCard
          title="Organic Traffic Trend"
          subtitle={`${domain} — last 12 months`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(0, 7)}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                }}
                labelStyle={{ color: "#64748b", fontSize: "11px" }}
                formatter={(value) => [formatNumber(Number(value)), "Traffic"]}
              />
              <Area
                type="monotone"
                dataKey="organicTraffic"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#trafficGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Position distribution */}
        {distribution.length > 0 && (
          <SectionCard
            title="Keyword Position Distribution"
            subtitle="SERP positions"
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={POSITION_COLORS[index % POSITION_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Keyword history */}
        {history.length > 0 && (
          <SectionCard
            title="Keyword Count Trend"
            subtitle="Total ranking keywords"
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="kwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                  formatter={(value) => [formatNumber(Number(value)), "Keywords"]}
                />
                <Area
                  type="monotone"
                  dataKey="organicKeywords"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#kwGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>

      {/* Top keywords table */}
      {keywords.length > 0 && (
        <SectionCard
          title="Top Organic Keywords"
          subtitle="By traffic percentage"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium text-xs">
                    Keyword
                  </th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">
                    Position
                  </th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">
                    Change
                  </th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">
                    Volume
                  </th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">
                    Traffic %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keywords.map((kw, i) => {
                  const change = kw.previousPosition - kw.position; // positive = moved up
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 pr-4">
                        <p className="text-slate-800 font-medium truncate max-w-[200px]">
                          {kw.keyword}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {kw.url}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                            kw.position <= 3
                              ? "bg-emerald-50 text-emerald-700"
                              : kw.position <= 10
                              ? "bg-blue-50 text-blue-700"
                              : kw.position <= 20
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {kw.position}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {change > 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-emerald-600">
                            <ArrowUp className="h-3 w-3" />
                            {change}
                          </span>
                        ) : change < 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-red-600">
                            <ArrowDown className="h-3 w-3" />
                            {Math.abs(change)}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Minus className="h-3 w-3 text-slate-500" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 text-xs">
                        {formatNumber(kw.searchVolume)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 text-xs">
                        {kw.trafficPercent.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
        </>
      )}
    </div>
  );
}
