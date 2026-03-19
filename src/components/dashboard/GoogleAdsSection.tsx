"use client";

import { useState, useEffect, useRef } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Delta } from "@/components/ui/index";
import { formatCurrency, formatNumber, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
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

interface GoogleAdsSearchTerm {
  searchTerm: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsData {
  overview: GoogleAdsOverview;
  campaigns: GoogleAdsCampaign[];
  adGroups: GoogleAdsAdGroup[];
  daily: GoogleAdsDailyPoint[];
  searchTerms: GoogleAdsSearchTerm[];
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

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

export function GoogleAdsSection({ customerId, startDate, endDate }: Props) {
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [prevData, setPrevData] = useState<GoogleAdsData | null>(null);
  const [prevOverview, setPrevOverview] = useState<GoogleAdsOverview | null>(null);
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
    setPrevOverview(null);
    setPrevData(null);

    const params = new URLSearchParams({ customerId, startDate, endDate });
    const prev = getPreviousPeriod(startDate, endDate);
    const prevParams = new URLSearchParams({ customerId, startDate: prev.startDate, endDate: prev.endDate });

    Promise.all([
      fetch(`/api/google-ads?${params}`, { signal: controller.signal, cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/google-ads?${prevParams}`, { signal: controller.signal, cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([json, prevJson]) => {
        if (json.error) setError(json.error);
        else setData(json);
        if (!prevJson?.error && prevJson?.overview) {
          setPrevOverview(prevJson.overview);
          setPrevData(prevJson);
        }
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
  const prevCampaignsMap = new Map((prevData?.campaigns ?? []).map((c) => [c.id, c]));
  const prevAdGroupsMap = new Map((prevData?.adGroups ?? []).map((ag) => [ag.id, ag]));

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paid Search</h2>
          <p className="text-sm text-slate-500 mt-0.5">Campaign performance data via Google Ads</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
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
        ) : error.includes("invalid_grant") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads OAuth token expired</p>
            <p className="text-sm text-slate-600">
              The refresh token has expired or been revoked — this typically happens when the Google Cloud OAuth app is in <strong>Testing</strong> mode (tokens expire after 7 days).
            </p>
            <ol className="text-sm text-slate-500 list-decimal list-inside space-y-1">
              <li>Run <span className="font-mono text-amber-700">node scripts/get-gads-refresh-token.mjs</span> to generate a new token</li>
              <li>Update <span className="font-mono text-amber-700">GOOGLE_ADS_REFRESH_TOKEN</span> in Vercel environment variables</li>
              <li>Redeploy or run <span className="font-mono text-amber-700">npx vercel env pull</span> locally</li>
              <li>To avoid this repeating, publish the OAuth consent screen in Google Cloud Console</li>
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
              change={prevOverview ? pctChange(data.overview.clicks, prevOverview.clicks) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.clicks, prevOverview.clicks, "count") : undefined}
            />
            <MetricCard
              title="Cost"
              value={formatCurrency(micros(data.overview.costMicros))}
              change={prevOverview ? pctChange(micros(data.overview.costMicros), micros(prevOverview.costMicros)) : undefined}
              changeDiff={prevOverview ? diffStr(micros(data.overview.costMicros), micros(prevOverview.costMicros), "currency") : undefined}
            />
            <MetricCard
              title="Conversions"
              value={formatNumber(data.overview.conversions)}
              change={prevOverview ? pctChange(data.overview.conversions, prevOverview.conversions) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.conversions, prevOverview.conversions, "count") : undefined}
            />
            <MetricCard
              title="Conv. Value"
              value={formatCurrency(data.overview.conversionsValue)}
              change={prevOverview ? pctChange(data.overview.conversionsValue, prevOverview.conversionsValue) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.conversionsValue, prevOverview.conversionsValue, "currency") : undefined}
            />
            <MetricCard
              title="ROAS"
              value={`${roas(data.overview.conversionsValue, data.overview.costMicros).toFixed(2)}x`}
              change={prevOverview ? pctChange(roas(data.overview.conversionsValue, data.overview.costMicros), roas(prevOverview.conversionsValue, prevOverview.costMicros)) : undefined}
            />
            <MetricCard
              title="CPA"
              value={formatCurrency(cpa(data.overview.costMicros, data.overview.conversions))}
              change={prevOverview ? pctChange(cpa(prevOverview.costMicros, prevOverview.conversions), cpa(data.overview.costMicros, data.overview.conversions)) : undefined}
              changeDiff={prevOverview ? diffStr(cpa(data.overview.costMicros, data.overview.conversions), cpa(prevOverview.costMicros, prevOverview.conversions), "currency") : undefined}
            />
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <MetricCard
              title="Impressions"
              value={formatNumber(data.overview.impressions)}
              change={prevOverview ? pctChange(data.overview.impressions, prevOverview.impressions) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.impressions, prevOverview.impressions, "count") : undefined}
            />
            <MetricCard
              title="CTR"
              value={formatPercent(ctr(data.overview.clicks, data.overview.impressions))}
              change={prevOverview ? pctChange(ctr(data.overview.clicks, data.overview.impressions), ctr(prevOverview.clicks, prevOverview.impressions)) : undefined}
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
                    {data.campaigns.map((c) => {
                      const prevC = prevCampaignsMap.get(c.id);
                      return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-800 font-medium max-w-[200px] truncate">
                          {c.name}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatNumber(c.clicks)}</div>
                          <Delta current={c.clicks} previous={prevC?.clicks} format="count" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatCurrency(micros(c.costMicros))}</div>
                          <Delta current={micros(c.costMicros)} previous={prevC ? micros(prevC.costMicros) : undefined} format="currency" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatNumber(c.conversions)}</div>
                          <Delta current={c.conversions} previous={prevC?.conversions} format="count" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatCurrency(c.conversionsValue)}</div>
                          <Delta current={c.conversionsValue} previous={prevC?.conversionsValue} format="currency" />
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
                          <Delta current={roas(c.conversionsValue, c.costMicros)} previous={prevC ? roas(prevC.conversionsValue, prevC.costMicros) : undefined} format="none" />
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          <div>{formatPercent(ctr(c.clicks, c.impressions))}</div>
                          <Delta current={ctr(c.clicks, c.impressions)} previous={prevC ? ctr(prevC.clicks, prevC.impressions) : undefined} format="none" />
                        </td>
                      </tr>
                      );
                    })}
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
                    {data.adGroups.map((ag) => {
                      const prevAg = prevAdGroupsMap.get(ag.id);
                      return (
                      <tr key={ag.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-800 font-medium max-w-[160px] truncate">
                          {ag.name}
                        </td>
                        <td className="px-4 py-4 text-slate-500 max-w-[140px] truncate">
                          {ag.campaignName}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatNumber(ag.clicks)}</div>
                          <Delta current={ag.clicks} previous={prevAg?.clicks} format="count" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatCurrency(micros(ag.costMicros))}</div>
                          <Delta current={micros(ag.costMicros)} previous={prevAg ? micros(prevAg.costMicros) : undefined} format="currency" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatNumber(ag.conversions)}</div>
                          <Delta current={ag.conversions} previous={prevAg?.conversions} format="count" />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          <div>{formatCurrency(ag.conversionsValue)}</div>
                          <Delta current={ag.conversionsValue} previous={prevAg?.conversionsValue} format="currency" />
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
                          <Delta current={roas(ag.conversionsValue, ag.costMicros)} previous={prevAg ? roas(prevAg.conversionsValue, prevAg.costMicros) : undefined} format="none" />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search terms report */}
          {(data.searchTerms ?? []).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Search Terms</h3>
                <p className="text-xs text-slate-500 mt-0.5">Top queries triggering your ads</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                      <th className="text-left px-6 py-4 font-medium">Search Term</th>
                      <th className="text-right px-4 py-4 font-medium">Clicks</th>
                      <th className="text-right px-4 py-4 font-medium">Impr.</th>
                      <th className="text-right px-4 py-4 font-medium">CTR</th>
                      <th className="text-right px-4 py-4 font-medium">Cost</th>
                      <th className="text-right px-6 py-4 font-medium">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.searchTerms ?? []).map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-800 font-medium max-w-[220px] truncate">
                          {st.searchTerm}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-700 font-semibold">
                          {formatNumber(st.clicks)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatNumber(st.impressions)}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatPercent(ctr(st.clicks, st.impressions))}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(micros(st.costMicros))}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {st.conversions.toFixed(1)}
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
