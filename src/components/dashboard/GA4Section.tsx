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
import { formatNumber, formatCurrency, formatPercent, formatDuration, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import { Users, UserPlus, Eye, MousePointer, Clock, TrendingUp } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";

interface GA4SectionProps {
  propertyId: string;
  startDate: string;
  endDate: string;
}

interface GA4Overview {
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  engagedSessions: number;
  engagementRate: number;
}

interface DailyData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

interface TopPage {
  pagePath: string;
  pageTitle: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}

interface GA4Country {
  country: string;
  sessions: number;
  users: number;
}

interface GA4Device {
  device: string;
  sessions: number;
  users: number;
}

const SOURCE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#6366f1",
  desktop: "#3b82f6",
  tablet: "#10b981",
};

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

export function GA4Section({ propertyId, startDate, endDate }: GA4SectionProps) {
  const [overview, setOverview] = useState<GA4Overview | null>(null);
  const [prevOverview, setPrevOverview] = useState<GA4Overview | null>(null);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [prevPages, setPrevPages] = useState<TopPage[]>([]);
  const [geography, setGeography] = useState<GA4Country[]>([]);
  const [deviceSplit, setDeviceSplit] = useState<GA4Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      setPrevOverview(null);
      setPrevPages([]);
      try {
        const base = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}&startDate=${startDate}&endDate=${endDate}`;
        const prev = getPreviousPeriod(startDate, endDate);
        const prevBase = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}&startDate=${prev.startDate}&endDate=${prev.endDate}`;
        const [ovRes, dailyRes, srcRes, pagesRes, prevOvRes, prevPagesRes, geoRes, devRes] = await Promise.all([
          fetch(`${base}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=daily`, { signal: controller.signal }),
          fetch(`${base}&type=sources`, { signal: controller.signal }),
          fetch(`${base}&type=pages`, { signal: controller.signal }),
          fetch(`${prevBase}&type=overview`, { signal: controller.signal }),
          fetch(`${prevBase}&type=pages`, { signal: controller.signal }),
          fetch(`${base}&type=geography`, { signal: controller.signal }),
          fetch(`${base}&type=devices`, { signal: controller.signal }),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch GA4 data");
        }

        const [ov, d, s, p, prevOv, prevP, geo, devs] = await Promise.all([
          ovRes.json(),
          dailyRes.json(),
          srcRes.json(),
          pagesRes.json(),
          prevOvRes.ok ? prevOvRes.json() : Promise.resolve(null),
          prevPagesRes.ok ? prevPagesRes.json() : Promise.resolve([]),
          geoRes.ok ? geoRes.json() : Promise.resolve([]),
          devRes.ok ? devRes.json() : Promise.resolve([]),
        ]);

        setOverview(ov);
        setDaily(Array.isArray(d) ? d : []);
        setSources(Array.isArray(s) ? s : []);
        setPages(Array.isArray(p) ? p : []);
        setPrevOverview(prevOv);
        setPrevPages(Array.isArray(prevP) ? prevP : []);
        setGeography(Array.isArray(geo) ? geo : []);
        setDeviceSplit(Array.isArray(devs) ? devs : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load GA4 data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [propertyId, startDate, endDate]);

  const sourceChartData = sources.slice(0, 6).map((s) => ({
    name: `${s.source} / ${s.medium}`,
    value: s.sessions,
  }));
  const prevPagesMap = new Map(prevPages.map((p) => [p.pagePath, p]));
  const totalDeviceSessions = deviceSplit.reduce((s, d) => s + d.sessions, 0);
  const deviceChartData = deviceSplit.map((d) => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    value: d.sessions,
    device: d.device,
  }));

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Web Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Site traffic data via Google Analytics 4</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading GA4 data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load GA4 data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !overview ? null : (
        <>
      {/* Overview metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Sessions"
          value={formatNumber(overview.sessions)}
          subtitle="All sessions"
          change={prevOverview ? pctChange(overview.sessions, prevOverview.sessions) : undefined}
          changeDiff={prevOverview ? diffStr(overview.sessions, prevOverview.sessions, "count") : undefined}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Users"
          value={formatNumber(overview.users)}
          subtitle="Active users"
          change={prevOverview ? pctChange(overview.users, prevOverview.users) : undefined}
          changeDiff={prevOverview ? diffStr(overview.users, prevOverview.users, "count") : undefined}
          icon={<Users className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="New Users"
          value={formatNumber(overview.newUsers)}
          subtitle="First-time visitors"
          change={prevOverview ? pctChange(overview.newUsers, prevOverview.newUsers) : undefined}
          changeDiff={prevOverview ? diffStr(overview.newUsers, prevOverview.newUsers, "count") : undefined}
          icon={<UserPlus className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Pageviews"
          value={formatNumber(overview.pageviews)}
          subtitle="Total page views"
          change={prevOverview ? pctChange(overview.pageviews, prevOverview.pageviews) : undefined}
          changeDiff={prevOverview ? diffStr(overview.pageviews, prevOverview.pageviews, "count") : undefined}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Bounce Rate"
          value={formatPercent(overview.bounceRate)}
          subtitle="Lower is better"
          change={prevOverview ? pctChange(prevOverview.bounceRate, overview.bounceRate) : undefined}
          icon={<MousePointer className="h-5 w-5" />}
          color="orange"
        />
        <MetricCard
          title="Avg. Session"
          value={formatDuration(overview.avgSessionDuration)}
          subtitle="Time on site"
          icon={<Clock className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Conv. Rate"
          value={formatPercent(overview.conversionRate)}
          subtitle="Goal completions"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Daily sessions chart */}
      {daily.length > 0 && (
        <SectionCard title="Sessions Over Time" subtitle="Daily sessions trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
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
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#sessGrad)"
                name="Sessions"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#userGrad)"
                name="Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Traffic sources pie */}
        {sources.length > 0 && (
          <SectionCard title="Traffic Sources" subtitle="Top acquisition channels">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                  formatter={(v) => [formatNumber(Number(v)), "Sessions"]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {value.length > 25 ? value.slice(0, 25) + "…" : value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Top pages table */}
        {pages.length > 0 && (
          <SectionCard title="Top Pages" subtitle="By sessions">
            <div className="divide-y divide-slate-100">
              {pages.slice(0, 6).map((page, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3.5"
                >
                  <span className="text-xs text-slate-400 w-5 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{page.pagePath}</p>
                    <p className="text-xs text-slate-500 truncate">{page.pageTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-800 font-medium">{formatNumber(page.sessions)}</p>
                    <Delta current={page.sessions} previous={prevPagesMap.get(page.pagePath)?.sessions} format="count" />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Device & Geography breakdown */}
      {(deviceChartData.length > 0 || geography.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Device split donut */}
          {deviceChartData.length > 0 && (
            <SectionCard title="Sessions by Device" subtitle="Device category breakdown">
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
                        fill={DEVICE_COLORS[entry.device] ?? ["#6366f1", "#3b82f6", "#10b981"][index % 3]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      color: "#0f172a",
                    }}
                    formatter={(v) => [formatNumber(Number(v)), "Sessions"]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around pt-1 pb-2">
                {deviceSplit.map((d, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-slate-500 capitalize">{d.device}</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {totalDeviceSessions > 0 ? ((d.sessions / totalDeviceSessions) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Top countries by sessions */}
          {geography.length > 0 && (
            <SectionCard title="Top Countries" subtitle="By sessions">
              <div className="divide-y divide-slate-100">
                {geography.slice(0, 8).map((c, i) => {
                  const maxSessions = geography[0]?.sessions ?? 1;
                  const barWidth = Math.round((c.sessions / maxSessions) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <span className="text-xs text-slate-400 w-5 shrink-0 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{c.country}</p>
                        <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-800">{formatNumber(c.sessions)}</p>
                        <p className="text-xs text-slate-500">{formatNumber(c.users)} users</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* AI Insights */}
      {!loading && !error && overview && (
        <AiInsightsPanel
          sectionType="ga4"
          metrics={{
            sessions: overview.sessions,
            users: overview.users,
            newUsers: overview.newUsers,
            pageviews: overview.pageviews,
            bounceRate: overview.bounceRate,
            avgSessionDuration: overview.avgSessionDuration,
            conversionRate: overview.conversionRate,
            engagedSessions: overview.engagedSessions ?? 0,
            engagementRate: overview.engagementRate ?? 0,
          }}
          previousMetrics={prevOverview ? {
            sessions: prevOverview.sessions,
            users: prevOverview.users,
            newUsers: prevOverview.newUsers,
            pageviews: prevOverview.pageviews,
            bounceRate: prevOverview.bounceRate,
            avgSessionDuration: prevOverview.avgSessionDuration,
            conversionRate: prevOverview.conversionRate,
            engagedSessions: prevOverview.engagedSessions ?? 0,
            engagementRate: prevOverview.engagementRate ?? 0,
          } : undefined}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
        />
      )}
        </>
      )}
    </div>
  );
}
