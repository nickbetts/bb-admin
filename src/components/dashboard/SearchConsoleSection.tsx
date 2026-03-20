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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, LoadingSpinner, Delta } from "@/components/ui/index";
import { formatNumber, formatDateDisplay, pctChange } from "@/lib/utils";
import { MousePointer, Eye, TrendingUp, Search } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";

interface SearchConsoleSectionProps {
  siteUrl: string;
  startDate: string;
  endDate: string;
}

interface GSCOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCDailyData {
  date: string;
  clicks: number;
  impressions: number;
}

interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const DEVICE_COLORS: Record<string, string> = {
  MOBILE: "#6366f1",
  DESKTOP: "#3b82f6",
  TABLET: "#10b981",
};
const DEVICE_FALLBACK_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b"];

function positionBadgeClass(pos: number): string {
  if (pos <= 3) return "badge badge-green";
  if (pos <= 10) return "badge badge-blue";
  if (pos <= 20) return "badge badge-orange";
  return "badge badge-slate";
}

export function SearchConsoleSection({
  siteUrl,
  startDate,
  endDate,
}: SearchConsoleSectionProps) {
  const [overview, setOverview] = useState<GSCOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<GSCOverview | null>(null);
  const [queries, setQueries] = useState<GSCQuery[]>([]);
  const [prevQueriesMap, setPrevQueriesMap] = useState<Map<string, GSCQuery>>(new Map());
  const [pages, setPages] = useState<GSCPage[]>([]);
  const [prevPagesMap, setPrevPagesMap] = useState<Map<string, GSCPage>>(new Map());
  const [daily, setDaily] = useState<GSCDailyData[]>([]);
  const [devices, setDevices] = useState<GSCDevice[]>([]);
  const [countries, setCountries] = useState<GSCCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      setPrevOverview(null);
      setPrevQueriesMap(new Map());
      setPrevPagesMap(new Map());
      try {
        // Single bulk call — fetches all current + previous period data in one serverless invocation
        const bulkUrl = `/api/search-console?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${startDate}&endDate=${endDate}&type=bulk`;
        const bulkRes = await fetch(bulkUrl, { signal: controller.signal });

        if (!bulkRes.ok) {
          const err = await bulkRes.json();
          throw new Error(err.error ?? "Failed to fetch Search Console data");
        }

        const { overview: ov, queries: q, pages: p, daily: d, devices: devs, countries: ctrs, prevOverview: prevOv, prevQueries: prevQ, prevPages: prevP } = await bulkRes.json();

        setOverview(ov);
        setQueries(Array.isArray(q) ? q : []);
        setPages(Array.isArray(p) ? p : []);
        setDaily(Array.isArray(d) ? d : []);
        setPrevOverview(prevOv ?? null);
        setDevices(Array.isArray(devs) ? devs : []);
        setCountries(Array.isArray(ctrs) ? ctrs : []);
        if (Array.isArray(prevQ)) setPrevQueriesMap(new Map(prevQ.map((pq: GSCQuery) => [pq.query, pq])));
        if (Array.isArray(prevP)) setPrevPagesMap(new Map(prevP.map((pp: GSCPage) => [pp.page, pp])));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Search Console data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [siteUrl, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
        <p className="text-sm font-medium text-red-700 mb-1">Failed to load Search Console data</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  const chartData = daily.map((d) => ({
    date: formatDateDisplay(d.date),
    Clicks: d.clicks,
    Impressions: d.impressions,
  }));

  // Only use prevOverview for comparisons if at least one metric is non-zero
  const hasPrevData = prevOverview != null && (prevOverview.clicks > 0 || prevOverview.impressions > 0);

  const deviceChartData = devices.map((d) => ({
    name: d.device.charAt(0) + d.device.slice(1).toLowerCase(),
    value: d.clicks,
    device: d.device,
  }));
  const totalDeviceClicks = devices.reduce((s, d) => s + d.clicks, 0);

  return (
    <div className="space-y-6">
      {/* Overview metrics */}
      <div className="grid-4">
        <MetricCard
          title="Total Clicks"
          value={formatNumber(overview?.clicks ?? 0)}
          change={hasPrevData ? pctChange(overview?.clicks ?? 0, prevOverview!.clicks) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<MousePointer className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(overview?.impressions ?? 0)}
          change={hasPrevData ? pctChange(overview?.impressions ?? 0, prevOverview!.impressions) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Average CTR"
          value={`${((overview?.ctr ?? 0) * 100).toFixed(2)}%`}
          change={hasPrevData ? pctChange(overview?.ctr ?? 0, prevOverview!.ctr) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Avg. Position"
          value={(overview?.position ?? 0).toFixed(1)}
          change={hasPrevData ? pctChange(prevOverview!.position, overview?.position ?? 0) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<Search className="h-5 w-5" />}
          color="orange"
        />
      </div>

      {/* Clicks & Impressions chart */}
      <SectionCard title="Clicks & Impressions" subtitle="Search performance over time">
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gscClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gscImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Area
                type="monotone"
                dataKey="Clicks"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gscClicks)"
              />
              <Area
                type="monotone"
                dataKey="Impressions"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gscImpressions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid-2">
        {/* Top Queries */}
        <SectionCard title="Top Queries" subtitle="Ranked by clicks">
          {queries.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No query data</p>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Query</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impr.</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>CTR</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, i) => {
                    const prevQ = prevQueriesMap.get(q.query);
                    return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>
                        <div>{formatNumber(q.clicks)}</div>
                        <Delta current={q.clicks} previous={prevQ?.clicks} format="count" />
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                        <div>{formatNumber(q.impressions)}</div>
                        <Delta current={q.impressions} previous={prevQ?.impressions} format="count" />
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                        <div>{(q.ctr * 100).toFixed(1)}%</div>
                        <Delta current={q.ctr} previous={prevQ?.ctr} format="none" />
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <div><span className={positionBadgeClass(q.position)}>{q.position.toFixed(1)}</span></div>
                        <Delta current={q.position} previous={prevQ?.position} format="count" invert />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Top Pages */}
        <SectionCard title="Top Pages" subtitle="Ranked by clicks">
          {pages.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No page data</p>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Page</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impr.</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>CTR</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, i) => {
                    let displayPage = p.page;
                    try {
                      const url = new URL(p.page);
                      displayPage = url.pathname + url.search;
                    } catch {}
                    const prevP = prevPagesMap.get(p.page);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <a href={p.page} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none" }}>
                            {displayPage}
                          </a>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>
                          <div>{formatNumber(p.clicks)}</div>
                          <Delta current={p.clicks} previous={prevP?.clicks} format="count" />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          <div>{formatNumber(p.impressions)}</div>
                          <Delta current={p.impressions} previous={prevP?.impressions} format="count" />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          <div>{(p.ctr * 100).toFixed(1)}%</div>
                          <Delta current={p.ctr} previous={prevP?.ctr} format="none" />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <div><span className={positionBadgeClass(p.position)}>{p.position.toFixed(1)}</span></div>
                          <Delta current={p.position} previous={prevP?.position} format="count" invert />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Position Movers — cross-reference current vs previous period queries */}
      {(() => {
        const movers = queries
          .filter(q => {
            const prev = prevQueriesMap.get(q.query);
            return prev != null && q.impressions >= 10 && (prev.position - q.position) > 0;
          })
          .map(q => {
            const prev = prevQueriesMap.get(q.query)!;
            return { ...q, prevPosition: prev.position, gain: prev.position - q.position };
          })
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 10);

        if (!movers.length) return null;
        return (
          <SectionCard title="Position Movers" subtitle="Queries with biggest rank improvements vs previous period">
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Query</th>
                    <th style={{ textAlign: "center", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Current</th>
                    <th style={{ textAlign: "center", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Previous</th>
                    <th style={{ textAlign: "center", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Gain</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {movers.map((q, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--text)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <span className={positionBadgeClass(q.position)}>{q.position.toFixed(1)}</span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>{q.prevPosition.toFixed(1)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "#ecfdf5", color: "#065f46" }}>
                          ↑ +{q.gain.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>{formatNumber(q.clicks)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(q.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })()}

      {/* Device & Country breakdown */}
      {(devices.length > 0 || countries.length > 0) && (
        <div className="grid-2">
          {/* Device split donut */}
          {deviceChartData.length > 0 && (
            <SectionCard title="Clicks by Device" subtitle="Device type breakdown">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEVICE_COLORS[entry.device] ?? DEVICE_FALLBACK_COLORS[index % DEVICE_FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v) => [formatNumber(Number(v)), "Clicks"]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around pt-1 pb-2">
                {devices.map((d, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-slate-500">{d.device.charAt(0) + d.device.slice(1).toLowerCase()}</p>
                    <p className="text-sm font-semibold text-slate-800">{totalDeviceClicks > 0 ? ((d.clicks / totalDeviceClicks) * 100).toFixed(0) : 0}%</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Top countries table */}
          {countries.length > 0 && (
            <SectionCard title="Top Countries" subtitle="Ranked by clicks">
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ textAlign: "left", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Country</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impr.</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", color: "var(--text-3)", fontWeight: 500 }}>CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)", textTransform: "capitalize" }}>
                          {c.country.toLowerCase()}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>
                          {formatNumber(c.clicks)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          {formatNumber(c.impressions)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          {(c.ctr * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* AI Insights */}
      {!loading && !error && overview && (
        <AiInsightsPanel
          sectionType="searchconsole"
          metrics={{
            clicks: overview.clicks,
            impressions: overview.impressions,
            ctr: overview.ctr,
            position: overview.position,
          }}
          previousMetrics={prevOverview ? {
            clicks: prevOverview.clicks,
            impressions: prevOverview.impressions,
            ctr: prevOverview.ctr,
            position: prevOverview.position,
          } : undefined}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
        />
      )}
    </div>
  );
}
