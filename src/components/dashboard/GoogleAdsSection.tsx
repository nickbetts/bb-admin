"use client";

import { useState, useEffect, useRef } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, formatNumber, formatPercent, formatDateDisplay } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface GoogleAdsOverview {
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsAdGroup {
  id: string;
  name: string;
  campaignName: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsDailyPoint {
  date: string;
  clicks: number;
  costMicros: number;
  conversions: number;
  impressions: number;
}

interface GoogleAdsData {
  overview: GoogleAdsOverview;
  campaigns: GoogleAdsCampaign[];
  adGroups: GoogleAdsAdGroup[];
  daily: GoogleAdsDailyPoint[];
}

interface Props {
  customerId: string;
  startDate: string;
  endDate: string;
}

function micros(v: number) {
  return v / 1_000_000;
}

function roas(conversionsValue: number, costMicros: number) {
  const cost = micros(costMicros);
  if (cost === 0) return 0;
  return conversionsValue / cost;
}

function cpa(costMicros: number, conversions: number) {
  if (conversions === 0) return 0;
  return micros(costMicros) / conversions;
}

function ctr(clicks: number, impressions: number) {
  if (impressions === 0) return 0;
  return clicks / impressions;
}

export function GoogleAdsSection({ customerId, startDate, endDate }: Props) {
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setData(null);

    const params = new URLSearchParams({ customerId, startDate, endDate });
    fetch(`/api/google-ads?${params}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load Google Ads data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [customerId, startDate, endDate]);

  const chartData = (data?.daily ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    cost: micros(d.costMicros),
    clicks: d.clicks,
    conversions: d.conversions,
  }));

  return (
    <div className="space-y-8">
      {/* Source badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Google Ads
          </span>
          <span className="text-xs text-slate-500">
            {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
          <span className="inline-block w-4 h-4 border-2 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
          Loading Google Ads data…
        </div>
      ) : error ? (
        error.includes("DEVELOPER_TOKEN_NOT_APPROVED") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads Basic Access required</p>
            <p className="text-sm text-slate-600">
              The Google Ads developer token is currently in test mode and cannot access real account data.
            </p>
            <ol className="text-sm text-slate-500 list-decimal list-inside space-y-1">
              <li>Sign in to <span className="text-amber-700 font-mono">ads.google.com</span> with a manager account</li>
              <li>Go to <strong className="text-slate-700">Tools → API Center</strong></li>
              <li>Click <strong className="text-slate-700">Apply for Basic Access</strong> and submit the form</li>
              <li>Approval typically takes 1–2 business days</li>
            </ol>
          </div>
        ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
        )
      ) : !data ? null : (
        <>
          {/* Overview metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <MetricCard
              title="Clicks"
              value={formatNumber(data.overview.clicks)}
            />
            <MetricCard
              title="Cost"
              value={formatCurrency(micros(data.overview.costMicros))}
            />
            <MetricCard
              title="Conversions"
              value={formatNumber(data.overview.conversions)}
            />
            <MetricCard
              title="Conv. Value"
              value={formatCurrency(data.overview.conversionsValue)}
            />
            <MetricCard
              title="ROAS"
              value={`${roas(data.overview.conversionsValue, data.overview.costMicros).toFixed(2)}x`}
            />
            <MetricCard
              title="CPA"
              value={formatCurrency(cpa(data.overview.costMicros, data.overview.conversions))}
            />
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <MetricCard
              title="Impressions"
              value={formatNumber(data.overview.impressions)}
            />
            <MetricCard
              title="CTR"
              value={formatPercent(ctr(data.overview.clicks, data.overview.impressions))}
            />
            <MetricCard
              title="Avg. CPC"
              value={formatCurrency(
                data.overview.clicks > 0
                  ? micros(data.overview.costMicros) / data.overview.clicks
                  : 0
              )}
            />
          </div>

          {/* Daily spend & clicks chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-5">Spend & Clicks Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gadsGradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gadsGradClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="cost"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={50}
                  />
                  <YAxis
                    yAxisId="clicks"
                    orientation="right"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#64748b" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const num = typeof value === "number" ? value : Number(value ?? 0);
                      if (name === "cost") return [`$${num.toFixed(2)}`, "Cost"];
                      if (name === "clicks") return [formatNumber(num), "Clicks"];
                      return [num, name];
                    }}
                  />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="cost"
                    stroke="#eab308"
                    strokeWidth={2}
                    fill="url(#gadsGradCost)"
                    dot={false}
                  />
                  <Area
                    yAxisId="clicks"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gadsGradClicks)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Campaign breakdown */}
          {data.campaigns.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Campaign Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                      <th className="text-left px-6 py-4 font-medium">Campaign</th>
                      <th className="text-right px-4 py-4 font-medium">Clicks</th>
                      <th className="text-right px-4 py-4 font-medium">Cost</th>
                      <th className="text-right px-4 py-4 font-medium">Conv.</th>
                      <th className="text-right px-4 py-4 font-medium">Conv. Value</th>
                      <th className="text-right px-4 py-4 font-medium">ROAS</th>
                      <th className="text-right px-6 py-4 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-800 font-medium max-w-[200px] truncate">
                          {c.name}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(c.clicks)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(micros(c.costMicros))}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(c.conversions)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(c.conversionsValue)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              roas(c.conversionsValue, c.costMicros) >= 2
                                ? "text-emerald-600"
                                : roas(c.conversionsValue, c.costMicros) >= 1
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {roas(c.conversionsValue, c.costMicros).toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {formatPercent(ctr(c.clicks, c.impressions))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ad group breakdown */}
          {data.adGroups.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Ad Group Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                      <th className="text-left px-6 py-4 font-medium">Ad Group</th>
                      <th className="text-left px-4 py-4 font-medium text-slate-600">Campaign</th>
                      <th className="text-right px-4 py-4 font-medium">Clicks</th>
                      <th className="text-right px-4 py-4 font-medium">Cost</th>
                      <th className="text-right px-4 py-4 font-medium">Conv.</th>
                      <th className="text-right px-4 py-4 font-medium">Conv. Value</th>
                      <th className="text-right px-6 py-4 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.adGroups.map((ag) => (
                      <tr key={ag.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-800 font-medium max-w-[160px] truncate">
                          {ag.name}
                        </td>
                        <td className="px-4 py-4 text-slate-500 max-w-[140px] truncate">
                          {ag.campaignName}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(ag.clicks)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(micros(ag.costMicros))}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(ag.conversions)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(ag.conversionsValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              roas(ag.conversionsValue, ag.costMicros) >= 2
                                ? "text-emerald-600"
                                : roas(ag.conversionsValue, ag.costMicros) >= 1
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {roas(ag.conversionsValue, ag.costMicros).toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
