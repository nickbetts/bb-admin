"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { Users, UserPlus, Eye, MousePointer, Clock, TrendingUp, AlertTriangle, Leaf, BarChart2 } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface GA4SectionProps {
  propertyId: string;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hideAlerts?: boolean;
  hideAi?: boolean;
  clientId?: string;
  clientName?: string;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  onPreviousMetricsReady?: (metrics: Record<string, number>) => void;
  afterHeader?: ReactNode;
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
  bounceRate: number;
  conversions: number;
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

interface GA4NewVsReturning {
  newUsers: number;
  returningUsers: number;
}

interface GA4Demographic {
  range?: string;
  gender?: string;
  users: number;
}

interface GA4Demographics {
  ageGroups: GA4Demographic[];
  genderSplit: GA4Demographic[];
}

interface GA4ConversionEvent {
  eventName: string;
  conversions: number;
}

interface GA4ConversionByChannel {
  channel: string;
  conversions: number;
  sessions: number;
}

interface GA4AIReferral {
  source: string;
  sessions: number;
  users: number;
}

type GA4Alert = { severity: "high" | "medium"; label: string; detail: string; recommendation: string };

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

export function GA4Section({ propertyId, startDate, endDate, compareStartDate, compareEndDate, crossPlatformContext, visibleBlocks, hideAlerts, hideAi, clientId, clientName, onMetricsReady, onPreviousMetricsReady, afterHeader }: GA4SectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [overview, setOverview] = useState<GA4Overview | null>(null);
  const [prevOverview, setPrevOverview] = useState<GA4Overview | null>(null);
  const [yoyOverview, setYoyOverview] = useState<GA4Overview | null>(null);
  const [organicOverview, setOrganicOverview] = useState<GA4Overview | null>(null);
  const [organicMode, setOrganicMode] = useState(false);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [prevPages, setPrevPages] = useState<TopPage[]>([]);
  const [geography, setGeography] = useState<GA4Country[]>([]);
  const [deviceSplit, setDeviceSplit] = useState<GA4Device[]>([]);
  const [newVsReturning, setNewVsReturning] = useState<GA4NewVsReturning | null>(null);
  const [demographics, setDemographics] = useState<GA4Demographics | null>(null);
  const [conversionEvents, setConversionEvents] = useState<GA4ConversionEvent[]>([]);
  const [conversionsByChannel, setConversionsByChannel] = useState<GA4ConversionByChannel[]>([]);
  const [aiReferrals, setAiReferrals] = useState<GA4AIReferral[]>([]);
  const [landingPages, setLandingPages] = useState<Array<{ page: string; sessions: number; bounceRate: number; conversions: number; avgDuration: number }>>([]);
  const [userJourneys, setUserJourneys] = useState<Array<{ path: string; users: number; conversions: number }>>([]);
  const [cohortRetention, setCohortRetention] = useState<Array<{ cohort: string; users: number; retention: number[] }>>([]);
  const [sessionDuration, setSessionDuration] = useState<Array<{ bucket: string; sessions: number }>>([]);
  const [eventParameters, setEventParameters] = useState<Array<{ eventName: string; eventCount: number; eventValue: number }>>([]);
  const [contentGrouping, setContentGrouping] = useState<Array<{ contentGroup: string; sessions: number; pageviews: number; bounceRate: number; avgSessionDuration: number }>>([]);
  const [scrollDepth, setScrollDepth] = useState<Array<{ percentScrolled: string; eventCount: number; users: number }>>([]);
  const [browserOs, setBrowserOs] = useState<Array<{ browser: string; operatingSystem: string; sessions: number; users: number }>>([]);
  const [ecommerceRevenue, setEcommerceRevenue] = useState<Array<{ pagePath: string; source: string; medium: string; transactions: number; purchaseRevenue: number; totalRevenue: number }>>([]);
  const [userAcquisition, setUserAcquisition] = useState<Array<{ firstUserSource: string; firstUserMedium: string; newUsers: number; sessions: number; engagedSessions: number; conversions: number }>>([]);
  const [revenuePerSession, setRevenuePerSession] = useState<Array<{ source: string; medium: string; sessions: number; totalRevenue: number; revenuePerSession: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);

  // Compute anomaly alerts from GA4 data
  const gaAlerts = useMemo<GA4Alert[]>(() => {
    if (!overview || !prevOverview) return [];
    const alerts: GA4Alert[] = [];
    const sessPct = pctChange(overview.sessions, prevOverview.sessions);
    if (sessPct != null && sessPct <= -20)
      alerts.push({ severity: "high", label: "Sessions", detail: `Sessions dropped ${Math.abs(sessPct).toFixed(0)}% vs previous period (${formatNumber(prevOverview.sessions)} → ${formatNumber(overview.sessions)})`, recommendation: "Investigate traffic source changes — check for lost referrals, campaign pauses, or SEO ranking drops. Review GA4 acquisition report for the source of the decline." });
    else if (sessPct != null && sessPct <= -10)
      alerts.push({ severity: "medium", label: "Sessions", detail: `Sessions declined ${Math.abs(sessPct).toFixed(0)}% vs previous period`, recommendation: "Monitor closely and compare traffic sources period-over-period. Check for seasonal patterns or recent campaign changes." });

    const bounceDiff = overview.bounceRate - prevOverview.bounceRate;
    if (bounceDiff >= 20)
      alerts.push({ severity: "high", label: "Bounce Rate", detail: `Bounce rate up ${bounceDiff.toFixed(1)}pp (${prevOverview.bounceRate.toFixed(1)}% → ${overview.bounceRate.toFixed(1)}%)`, recommendation: "Check for landing page issues, slow load times, or broken experiences. Review the top landing pages for UX problems or content relevance." });
    else if (bounceDiff >= 10)
      alerts.push({ severity: "medium", label: "Bounce Rate", detail: `Bounce rate increased ${bounceDiff.toFixed(1)}pp vs previous period`, recommendation: "Audit top landing pages for relevance and load speed. Ensure ad/search intent matches page content." });

    const convPct = pctChange(overview.conversionRate, prevOverview.conversionRate);
    if (convPct != null && convPct <= -30)
      alerts.push({ severity: "high", label: "Conversion Rate", detail: `Conversion rate dropped ${Math.abs(convPct).toFixed(0)}% (${prevOverview.conversionRate.toFixed(2)}% → ${overview.conversionRate.toFixed(2)}%)`, recommendation: "Review conversion tracking setup, check for broken forms or checkout flows, and audit landing page changes made during this period." });
    else if (convPct != null && convPct <= -15)
      alerts.push({ severity: "medium", label: "Conversion Rate", detail: `Conversion rate declined ${Math.abs(convPct).toFixed(0)}% vs previous period`, recommendation: "Compare conversion paths and check if traffic quality has shifted. Review any landing page or offering changes." });

    const engPct = pctChange(overview.engagementRate, prevOverview.engagementRate);
    if (engPct != null && engPct <= -25)
      alerts.push({ severity: "medium", label: "Engagement Rate", detail: `Engagement rate dropped ${Math.abs(engPct).toFixed(0)}% (${prevOverview.engagementRate.toFixed(1)}% → ${overview.engagementRate.toFixed(1)}%)`, recommendation: "Investigate content quality and audience relevance. Check if new traffic sources are bringing lower-quality visitors." });

    const newUserPct = pctChange(overview.newUsers, prevOverview.newUsers);
    if (newUserPct != null && newUserPct <= -30)
      alerts.push({ severity: "medium", label: "New Users", detail: `New users dropped ${Math.abs(newUserPct).toFixed(0)}% (${formatNumber(prevOverview.newUsers)} → ${formatNumber(overview.newUsers)})`, recommendation: "Check acquisition channels — review SEO rankings, ad campaigns, and referral traffic for declines in new visitor sources." });

    const durPct = pctChange(overview.avgSessionDuration, prevOverview.avgSessionDuration);
    if (durPct != null && durPct <= -30)
      alerts.push({ severity: "medium", label: "Session Duration", detail: `Avg session duration dropped ${Math.abs(durPct).toFixed(0)}% vs previous period`, recommendation: "Review content engagement and page depth. Check if high-bounce traffic sources are diluting session quality." });

    if (overview.sessions > 200 && overview.conversionRate === 0 && prevOverview.conversionRate > 0)
      alerts.push({ severity: "medium", label: "Zero Conversions", detail: `${formatNumber(overview.sessions)} sessions with 0 conversions (previously ${prevOverview.conversionRate.toFixed(2)}%)`, recommendation: "Verify conversion tracking is firing correctly. Check GA4 event configuration, tag manager triggers, and key event definitions." });

    // Paid session quality alerts
    const paidSources = sources.filter(s => s.medium === "cpc" || s.medium === "ppc" || s.medium === "paid" || s.medium === "paidsocial");
    const organicSources = sources.filter(s => s.medium === "organic");
    if (paidSources.length > 0) {
      const avgPaidBounce = paidSources.reduce((sum, s) => sum + s.bounceRate * s.sessions, 0) / Math.max(1, paidSources.reduce((sum, s) => sum + s.sessions, 0));
      if (avgPaidBounce > 0.70)
        alerts.push({ severity: "high", label: "Paid Traffic Quality", detail: `Paid traffic bounce rate is ${(avgPaidBounce * 100).toFixed(0)}% — over 70% of paid sessions leave immediately`, recommendation: "Review ad targeting, keyword match types, and landing page relevance. High bounce rates on paid traffic indicate wasted ad spend." });
      else if (avgPaidBounce > 0.55)
        alerts.push({ severity: "medium", label: "Paid Traffic Quality", detail: `Paid traffic bounce rate is ${(avgPaidBounce * 100).toFixed(0)}% — elevated vs typical benchmarks`, recommendation: "Audit ad copy and landing page alignment. Consider tightening audience targeting and adding negative keywords." });

      const paidSessions = paidSources.reduce((sum, s) => sum + s.sessions, 0);
      const paidConversions = paidSources.reduce((sum, s) => sum + s.conversions, 0);
      const paidCVR = paidSessions > 0 ? paidConversions / paidSessions : 0;
      const orgSessions = organicSources.reduce((sum, s) => sum + s.sessions, 0);
      const orgConversions = organicSources.reduce((sum, s) => sum + s.conversions, 0);
      const orgCVR = orgSessions > 0 ? orgConversions / orgSessions : 0;
      if (orgCVR > 0 && paidCVR > 0 && orgCVR > paidCVR * 3)
        alerts.push({ severity: "medium", label: "Paid vs Organic CVR", detail: `Organic CVR (${(orgCVR * 100).toFixed(1)}%) is ${(orgCVR / paidCVR).toFixed(1)}× higher than paid CVR (${(paidCVR * 100).toFixed(1)}%)`, recommendation: "Paid traffic is converting at a much lower rate than organic. Review ad targeting quality, landing page experience for paid visitors, and consider reallocating budget to higher-converting campaigns." });
    }

    const sevOrder: Record<string, number> = { high: 0, medium: 1 };
    alerts.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
    return alerts;
  }, [overview, prevOverview, sources]);

  // Fetch AI-generated recommendations for each alert
  useEffect(() => {
    setAlertAiRecs([]);
    if (!gaAlerts.length) return;
    setAlertAiLoading(true);
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionType: "alert_recommendations",
        campaignPlatform: "ga4",
        alerts: gaAlerts.map(a => ({ severity: a.severity, label: a.label, detail: a.detail })),
        dateRange: `${startDate} to ${endDate}`,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.recommendations?.length) setAlertAiRecs(json.recommendations); })
      .catch(() => {})
      .finally(() => setAlertAiLoading(false));
  }, [gaAlerts, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      setPrevOverview(null);
      setPrevPages([]);
      setYoyOverview(null);
      setOrganicOverview(null);
      try {
        const base = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}&startDate=${startDate}&endDate=${endDate}`;
        // Use custom comparison period if provided, otherwise compute previous period automatically
        const prev = (compareStartDate && compareEndDate)
          ? { startDate: compareStartDate, endDate: compareEndDate }
          : getPreviousPeriod(startDate, endDate);
        const prevBase = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}&startDate=${prev.startDate}&endDate=${prev.endDate}`;
        // Year-ago: shift start/end dates back by 1 year
        // Clamp day if year subtraction produces an invalid date (e.g. Feb 29 → Feb 28 on non-leap years)
        const yoyStart = new Date(startDate);
        const origStartMonth = yoyStart.getMonth();
        yoyStart.setFullYear(yoyStart.getFullYear() - 1);
        if (yoyStart.getMonth() !== origStartMonth) yoyStart.setDate(0);
        const yoyEnd = new Date(endDate);
        const origEndMonth = yoyEnd.getMonth();
        yoyEnd.setFullYear(yoyEnd.getFullYear() - 1);
        if (yoyEnd.getMonth() !== origEndMonth) yoyEnd.setDate(0);
        const yoyBase = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}&startDate=${yoyStart.toISOString().split("T")[0]}&endDate=${yoyEnd.toISOString().split("T")[0]}`;
        const [ovRes, dailyRes, srcRes, pagesRes, prevOvRes, prevPagesRes, geoRes, devRes, organicRes, yoyRes, nvrRes, demoRes, cvEvRes, cvChRes, aiRefRes, lpRes, ujRes, crRes, sessDurRes, evParamRes, contGrpRes, scrollRes, browserOsRes, ecomRevRes, userAcqRes, revSessRes] = await Promise.all([
          fetch(`${base}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=daily`, { signal: controller.signal }),
          fetch(`${base}&type=sources`, { signal: controller.signal }),
          fetch(`${base}&type=pages`, { signal: controller.signal }),
          fetch(`${prevBase}&type=overview`, { signal: controller.signal }),
          fetch(`${prevBase}&type=pages`, { signal: controller.signal }),
          fetch(`${base}&type=geography`, { signal: controller.signal }),
          fetch(`${base}&type=devices`, { signal: controller.signal }),
          fetch(`${base}&type=organic-overview`, { signal: controller.signal }),
          fetch(`${yoyBase}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=new-vs-returning`, { signal: controller.signal }),
          fetch(`${base}&type=demographics`, { signal: controller.signal }),
          fetch(`${base}&type=conversion-events`, { signal: controller.signal }),
          fetch(`${base}&type=conversions-by-channel`, { signal: controller.signal }),
          fetch(`${base}&type=ai-referrals`, { signal: controller.signal }),
          fetch(`${base}&type=landing-pages`, { signal: controller.signal }),
          fetch(`${base}&type=user-journeys`, { signal: controller.signal }),
          fetch(`${base}&type=cohort-retention`, { signal: controller.signal }),
          fetch(`${base}&type=session-duration`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=event-parameters`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=content-grouping`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=scroll-depth`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=browser-os`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=ecommerce-revenue`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=user-acquisition`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=revenue-per-session`, { signal: controller.signal }).catch(() => null),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch GA4 data");
        }

        const [ov, d, s, p, prevOv, prevP, geo, devs, organic, yoy, nvr, demo, cvEv, cvCh, aiRef, lp, uj, cr, sessDurData, evParamData, contGrpData, scrollData, browserData, ecomRevData, userAcqData, revSessData] = await Promise.all([
          ovRes.json(),
          dailyRes.json(),
          srcRes.json(),
          pagesRes.json(),
          prevOvRes.ok ? prevOvRes.json() : Promise.resolve(null),
          prevPagesRes.ok ? prevPagesRes.json() : Promise.resolve([]),
          geoRes.ok ? geoRes.json() : Promise.resolve([]),
          devRes.ok ? devRes.json() : Promise.resolve([]),
          organicRes.ok ? organicRes.json() : Promise.resolve(null),
          yoyRes.ok ? yoyRes.json() : Promise.resolve(null),
          nvrRes.ok ? nvrRes.json() : Promise.resolve(null),
          demoRes.ok ? demoRes.json() : Promise.resolve(null),
          cvEvRes.ok ? cvEvRes.json() : Promise.resolve([]),
          cvChRes.ok ? cvChRes.json() : Promise.resolve([]),
          aiRefRes.ok ? aiRefRes.json() : Promise.resolve([]),
          lpRes.ok ? lpRes.json().catch(() => []) : Promise.resolve([]),
          ujRes.ok ? ujRes.json().catch(() => []) : Promise.resolve([]),
          crRes.ok ? crRes.json().catch(() => []) : Promise.resolve([]),
          sessDurRes?.ok ? sessDurRes.json().catch(() => []) : Promise.resolve([]),
          evParamRes?.ok ? evParamRes.json().catch(() => []) : Promise.resolve([]),
          contGrpRes?.ok ? contGrpRes.json().catch(() => []) : Promise.resolve([]),
          scrollRes?.ok ? scrollRes.json().catch(() => []) : Promise.resolve([]),
          browserOsRes?.ok ? browserOsRes.json().catch(() => []) : Promise.resolve([]),
          ecomRevRes?.ok ? ecomRevRes.json().catch(() => []) : Promise.resolve([]),
          userAcqRes?.ok ? userAcqRes.json().catch(() => []) : Promise.resolve([]),
          revSessRes?.ok ? revSessRes.json().catch(() => []) : Promise.resolve([]),
        ]);

        setOverview(ov);
        if (ov) onMetricsReady?.({
          sessions: ov.sessions, users: ov.users, newUsers: ov.newUsers,
          pageviews: ov.pageviews, bounceRate: ov.bounceRate,
          avgSessionDuration: ov.avgSessionDuration, conversionRate: ov.conversionRate,
          engagedSessions: ov.engagedSessions ?? 0, engagementRate: ov.engagementRate ?? 0,
        });
        setDaily(Array.isArray(d) ? d : []);
        setSources(Array.isArray(s) ? s : []);
        setPages(Array.isArray(p) ? p : []);
        setPrevOverview(prevOv);
        if (prevOv) onPreviousMetricsReady?.({
          sessions: prevOv.sessions, users: prevOv.users, newUsers: prevOv.newUsers,
          pageviews: prevOv.pageviews, bounceRate: prevOv.bounceRate,
          avgSessionDuration: prevOv.avgSessionDuration, conversionRate: prevOv.conversionRate,
          engagedSessions: prevOv.engagedSessions ?? 0, engagementRate: prevOv.engagementRate ?? 0,
        });
        setPrevPages(Array.isArray(prevP) ? prevP : []);
        setGeography(Array.isArray(geo) ? geo : []);
        setDeviceSplit(Array.isArray(devs) ? devs : []);
        setOrganicOverview(organic);
        setYoyOverview(yoy);
        setNewVsReturning(nvr);
        setDemographics(demo);
        setConversionEvents(Array.isArray(cvEv) ? cvEv : []);
        setConversionsByChannel(Array.isArray(cvCh) ? cvCh : []);
        setAiReferrals(Array.isArray(aiRef) ? aiRef : []);
        setLandingPages(Array.isArray(lp) ? lp : []);
        setUserJourneys(Array.isArray(uj) ? uj : []);
        setCohortRetention(Array.isArray(cr) ? cr : []);
        setSessionDuration(Array.isArray(sessDurData) ? sessDurData : []);
        setEventParameters(Array.isArray(evParamData) ? evParamData : []);
        setContentGrouping(Array.isArray(contGrpData) ? contGrpData : []);
        setScrollDepth(Array.isArray(scrollData) ? scrollData : []);
        setBrowserOs(Array.isArray(browserData) ? browserData : []);
        setEcommerceRevenue(Array.isArray(ecomRevData) ? ecomRevData : []);
        setUserAcquisition(Array.isArray(userAcqData) ? userAcqData : []);
        setRevenuePerSession(Array.isArray(revSessData) ? revSessData : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load GA4 data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [propertyId, startDate, endDate, compareStartDate, compareEndDate]);

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
  // Use organic or all-traffic depending on toggle
  const displayOverview = organicMode && organicOverview ? organicOverview : overview;
  const displayPrev = organicMode ? null : prevOverview; // no prev for organic mode (simplicity)

  return (
    <div className="flex flex-col gap-8">
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

      {afterHeader}

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
      {/* Performance alerts */}
      {!hideAlerts && gaAlerts.length > 0 && (() => {
        const highAlerts = gaAlerts.filter(a => a.severity === "high");
        const medAlerts  = gaAlerts.filter(a => a.severity === "medium");
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                {highAlerts.length} high-priority · {medAlerts.length} medium-priority issue{gaAlerts.length !== 1 ? "s" : ""} detected
              </p>
              {alertAiLoading && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#0f766e", fontStyle: "italic", flexShrink: 0 }}>Generating AI recommendations…</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {gaAlerts.map((a, i) => (
                <div key={i} style={{ padding: "8px 16px", borderBottom: i < gaAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: a.severity === "high" ? "#dc2626" : "#d97706", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{a.label}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{a.detail}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#0f766e", margin: "3px 0 0 0", lineHeight: 1.5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: alertAiRecs[i] ? "#d1fae5" : "#f0fdf4", color: alertAiRecs[i] ? "#065f46" : "#0f766e", borderRadius: 4, padding: "1px 5px", marginRight: 6 }}>
                      {alertAiRecs[i] ? "AI" : "Action"}
                    </span>
                    {alertAiRecs[i] ?? a.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Overview metrics */}
      {show("kpis") && (
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
      )}

      {/* Engaged sessions secondary row (GA4 v2 engagement metrics) */}
      {show("secondary_kpis") && displayOverview && (displayOverview.engagedSessions > 0 || displayOverview.engagementRate > 0) && (
        <div className="grid grid-cols-2 gap-5">
          <MetricCard
            title="Engaged Sessions"
            value={formatNumber(displayOverview.engagedSessions)}
            subtitle="Sessions with 10s+ engagement"
            change={displayPrev?.engagedSessions != null
              ? pctChange(displayOverview.engagedSessions, displayPrev.engagedSessions)
              : undefined}
            changeDiff={displayPrev?.engagedSessions != null
              ? diffStr(displayOverview.engagedSessions, displayPrev.engagedSessions, "count")
              : undefined}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <MetricCard
            title="Engagement Rate"
            value={formatPercent(displayOverview.engagementRate)}
            subtitle="% sessions actively engaged"
            change={displayPrev?.engagementRate != null
              ? pctChange(displayOverview.engagementRate, displayPrev.engagementRate)
              : undefined}
            icon={<TrendingUp className="h-5 w-5" />}
            color="blue"
          />
        </div>
      )}

      {/* Daily sessions chart */}
      {show("chart") && daily.length > 0 && (
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
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {(show("traffic_sources") || show("top_pages")) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Traffic sources pie */}
        {show("traffic_sources") && sources.length > 0 && (
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
        {show("top_pages") && pages.length > 0 && (
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
      )}

      {/* Device & Geography breakdown */}
      {(show("devices") || show("countries")) && (deviceChartData.length > 0 || geography.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Device split donut */}
          {show("devices") && deviceChartData.length > 0 && (
            <SectionCard title="Sessions by Device" subtitle="Device category breakdown">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
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
          {show("countries") && geography.length > 0 && (
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
      {/* New vs Returning */}
      {show("new_vs_returning") && newVsReturning && (newVsReturning.newUsers + newVsReturning.returningUsers) > 0 && (() => {
        const total = newVsReturning.newUsers + newVsReturning.returningUsers;
        const newPct = Math.round((newVsReturning.newUsers / total) * 100);
        const retPct = 100 - newPct;
        return (
          <SectionCard title="New vs Returning Visitors" subtitle="User loyalty split">
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#6366f1", fontWeight: 600 }}>New — {newPct}%</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>Returning — {retPct}%</span>
                </div>
                <div style={{ height: 12, borderRadius: 6, overflow: "hidden", background: "#e2e8f0", display: "flex" }}>
                  <div style={{ width: `${newPct}%`, background: "#6366f1" }} />
                  <div style={{ width: `${retPct}%`, background: "#10b981" }} />
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>New Users</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", margin: 0 }}>{formatNumber(newVsReturning.newUsers)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>Returning</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#10b981", margin: 0 }}>{formatNumber(newVsReturning.returningUsers)}</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {/* Demographics */}
      {show("demographics") && demographics && (demographics.ageGroups.length > 0 || demographics.genderSplit.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {demographics.ageGroups.length > 0 && (
            <SectionCard title="Age Groups" subtitle="User age distribution">
              <div className="divide-y divide-slate-100">
                {demographics.ageGroups.map((a, i) => {
                  const max = demographics.ageGroups[0]?.users ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <span style={{ fontSize: 12, color: "var(--text-3)", minWidth: 56 }}>{a.range}</span>
                      <div style={{ flex: 1, height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((a.users / max) * 100)}%`, height: "100%", background: "#6366f1", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: "right" }}>{formatNumber(a.users)}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          {demographics.genderSplit.length > 0 && (() => {
            const total = demographics.genderSplit.reduce((s, g) => s + g.users, 0);
            return (
              <SectionCard title="Gender Split" subtitle="User gender distribution">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {demographics.genderSplit.map((g, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{g.gender}</span>
                        <span style={{ color: "var(--text-3)" }}>{total > 0 ? Math.round((g.users / total) * 100) : 0}% · {formatNumber(g.users)}</span>
                      </div>
                      <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${total > 0 ? Math.round((g.users / total) * 100) : 0}%`, height: "100%", background: i === 0 ? "#3b82f6" : "#ec4899", borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })()}
        </div>
      )}

      {/* Conversion Events */}
      {show("conversion_events") && conversionEvents.length > 0 && (
        <SectionCard title="Conversion Events" subtitle="Key events tracked this period">
          <div className="divide-y divide-slate-100">
            {conversionEvents.map((ev, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "monospace" }}>{ev.eventName}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{formatNumber(ev.conversions)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Conversions by Channel */}
      {show("conversions_by_channel") && conversionsByChannel.length > 0 && (() => {
        const maxConv = conversionsByChannel[0]?.conversions ?? 1;
        return (
          <SectionCard title="Conversions by Channel" subtitle="Which channels drive goals">
            <div className="divide-y divide-slate-100">
              {conversionsByChannel.map((ch, i) => (
                <div key={i} className="py-2.5">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{ch.channel}</span>
                    <span style={{ fontWeight: 700, color: "#6366f1" }}>{ch.conversions} conv · {ch.sessions > 0 ? ((ch.conversions / ch.sessions) * 100).toFixed(2) : "0.00"}% CVR</span>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((ch.conversions / maxConv) * 100)}%`, height: "100%", background: "#6366f1" }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      {/* AI Search Referrals */}
      {show("ai_referrals") && (
        <SectionCard title="AI Search Referrals" subtitle="Sessions from ChatGPT, Claude, Perplexity and other AI tools">
          {aiReferrals.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No AI referral traffic detected in this period.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {aiReferrals.map((ref, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{ref.source}</span>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span><span className="font-semibold text-indigo-600">{formatNumber(ref.sessions)}</span> sessions</span>
                    <span><span className="font-semibold">{formatNumber(ref.users)}</span> users</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Super Summary */}

      {/* Landing Page Performance */}
      {!loading && !error && show("landing_pages") && landingPages.length > 0 && (
        <SectionCard title="Landing Page Performance" subtitle="Top entry pages by sessions">
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) repeat(4, minmax(90px, 1fr))", gap: 0, fontSize: 13 }}>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)" }}>Page</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Sessions</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Bounce Rate</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Conversions</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Avg Duration</div>
              {[...landingPages].sort((a, b) => b.sessions - a.sessions).slice(0, 10).map((lp, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }} title={lp.page}>{lp.page}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600, color: "#6366f1" }}>{formatNumber(lp.sessions)}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", color: lp.bounceRate > 0.7 ? "#ef4444" : lp.bounceRate > 0.5 ? "#f59e0b" : "#10b981" }}>{formatPercent(lp.bounceRate)}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600 }}>{formatNumber(lp.conversions)}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{formatDuration(lp.avgDuration)}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* User Journeys */}
      {!loading && !error && show("user_journeys") && userJourneys.length > 0 && (
        <SectionCard title="User Journeys" subtitle="Most common navigation paths">
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 3fr) repeat(2, minmax(90px, 1fr))", gap: 0, fontSize: 13 }}>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)" }}>Path</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Users</div>
              <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Conversions</div>
              {userJourneys.map((uj, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)", fontFamily: "monospace", fontSize: 12 }} title={uj.path}>{uj.path}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600, color: "#6366f1" }}>{formatNumber(uj.users)}</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600 }}>{formatNumber(uj.conversions)}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Cohort Retention */}
      {!loading && !error && show("cohort_retention") && cohortRetention.length > 0 && (() => {
        const maxWeeks = Math.max(...cohortRetention.map(c => c.retention.length));
        const retentionColor = (pct: number) => {
          if (pct >= 60) return "#059669";
          if (pct >= 40) return "#10b981";
          if (pct >= 20) return "#f59e0b";
          if (pct >= 10) return "#f97316";
          return "#ef4444";
        };
        const retentionBg = (pct: number) => {
          if (pct >= 60) return "rgba(5,150,105,0.12)";
          if (pct >= 40) return "rgba(16,185,129,0.10)";
          if (pct >= 20) return "rgba(245,158,11,0.10)";
          if (pct >= 10) return "rgba(249,115,22,0.10)";
          return "rgba(239,68,68,0.10)";
        };
        return (
          <SectionCard title="Cohort Retention" subtitle="Weekly cohort retention rates">
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: `minmax(100px, 1fr) minmax(70px, auto) repeat(${maxWeeks}, minmax(60px, 1fr))`, gap: 0, fontSize: 12 }}>
                <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)" }}>Cohort</div>
                <div style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "right" }}>Users</div>
                {Array.from({ length: maxWeeks }, (_, i) => (
                  <div key={i} style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-4)", borderBottom: "2px solid var(--border)", textAlign: "center" }}>Wk {i + 1}</div>
                ))}
                {cohortRetention.map((c, i) => (
                  <div key={i} style={{ display: "contents" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 12, whiteSpace: "nowrap" }}>{c.cohort}</div>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600 }}>{formatNumber(c.users)}</div>
                    {Array.from({ length: maxWeeks }, (_, wi) => {
                      const pct = c.retention[wi];
                      return (
                        <div key={wi} style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "center", fontWeight: 600, color: pct != null ? retentionColor(pct) : "var(--text-4)", background: pct != null ? retentionBg(pct) : "transparent" }}>
                          {pct != null ? `${pct.toFixed(1)}%` : "–"}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {/* Super Summary */}
      {!hideAi && !loading && !error && overview && (
        <SuperSummary
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
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} \u2013 ${formatDateDisplay(endDate)}`}
          extraContext={sources.length > 0 ? [
            "Top traffic sources this period:",
            ...sources.slice(0, 6).map((s) =>
              `  \u2022 ${s.source} / ${s.medium} \u2014 ${s.sessions.toLocaleString()} sessions, ${s.users.toLocaleString()} users, ${(s.bounceRate * 100).toFixed(0)}% bounce, ${s.conversions} conversions`
            ),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!hideAi && !loading && !error && overview && (
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
          clientId={clientId}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          extraContext={sources.length > 0 ? [
            "Top traffic sources this period:",
            ...sources.slice(0, 6).map((s) =>
              `  • ${s.source} / ${s.medium} — ${s.sessions.toLocaleString()} sessions, ${s.users.toLocaleString()} users, ${(s.bounceRate * 100).toFixed(0)}% bounce, ${s.conversions} conversions`
            ),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* Session Duration Distribution */}
      {show("session_duration") && sessionDuration.length > 0 && (
        <SectionCard title="Session Duration Distribution" subtitle="How long users spend per session">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionDuration} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Event Parameters */}
      {show("event_parameters") && eventParameters.length > 0 && (
        <SectionCard title="Event Parameters" subtitle={`${eventParameters.length} event${eventParameters.length !== 1 ? "s" : ""} tracked`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 400 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Event Name</th>
                  <th className="text-right px-4 py-3 font-medium">Count</th>
                  <th className="text-right px-6 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {eventParameters.map((e) => (
                  <tr key={e.eventName} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{e.eventName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(e.eventCount)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{e.eventValue > 0 ? formatCurrency(e.eventValue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Content Grouping */}
      {show("content_grouping") && contentGrouping.length > 0 && (
        <SectionCard title="Content Grouping" subtitle="Performance by content group">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 560 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Content Group</th>
                  <th className="text-right px-4 py-3 font-medium">Sessions</th>
                  <th className="text-right px-4 py-3 font-medium">Pageviews</th>
                  <th className="text-right px-4 py-3 font-medium">Bounce Rate</th>
                  <th className="text-right px-6 py-3 font-medium">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contentGrouping.map((cg) => (
                  <tr key={cg.contentGroup} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{cg.contentGroup || "(not set)"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(cg.sessions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(cg.pageviews)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{(cg.bounceRate * 100).toFixed(1)}%</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatDuration(cg.avgSessionDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Scroll Depth */}
      {show("scroll_depth") && scrollDepth.length > 0 && (
        <SectionCard title="Scroll Depth" subtitle="How far users scroll on pages">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={scrollDepth} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="percentScrolled" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Browser & OS */}
      {show("browser_os") && browserOs.length > 0 && (
        <SectionCard title="Browser & OS" subtitle={`${browserOs.length} browser/OS combination${browserOs.length !== 1 ? "s" : ""}`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Browser</th>
                  <th className="text-left px-4 py-3 font-medium">Operating System</th>
                  <th className="text-right px-4 py-3 font-medium">Sessions</th>
                  <th className="text-right px-6 py-3 font-medium">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {browserOs.map((bo, i) => (
                  <tr key={`${bo.browser}-${bo.operatingSystem}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{bo.browser}</td>
                    <td className="px-4 py-3 text-slate-600">{bo.operatingSystem}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(bo.sessions)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatNumber(bo.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Ecommerce Revenue */}
      {show("ecommerce_revenue") && ecommerceRevenue.length > 0 && (
        <SectionCard title="Ecommerce Revenue" subtitle="Revenue by page and source">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Page</th>
                  <th className="text-left px-4 py-3 font-medium">Source / Medium</th>
                  <th className="text-right px-4 py-3 font-medium">Transactions</th>
                  <th className="text-right px-4 py-3 font-medium">Purchase Revenue</th>
                  <th className="text-right px-6 py-3 font-medium">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ecommerceRevenue.map((er, i) => (
                  <tr key={`${er.pagePath}-${er.source}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium truncate max-w-[200px]">{er.pagePath}</td>
                    <td className="px-4 py-3 text-slate-600">{er.source} / {er.medium}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(er.transactions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(er.purchaseRevenue)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(er.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* User Acquisition */}
      {show("user_acquisition") && userAcquisition.length > 0 && (
        <SectionCard title="User Acquisition" subtitle="First-touch source for new users">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">First Source / Medium</th>
                  <th className="text-right px-4 py-3 font-medium">New Users</th>
                  <th className="text-right px-4 py-3 font-medium">Sessions</th>
                  <th className="text-right px-4 py-3 font-medium">Engaged</th>
                  <th className="text-right px-6 py-3 font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {userAcquisition.map((ua, i) => (
                  <tr key={`${ua.firstUserSource}-${ua.firstUserMedium}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{ua.firstUserSource} / {ua.firstUserMedium}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(ua.newUsers)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(ua.sessions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(ua.engagedSessions)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatNumber(ua.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Revenue Per Session */}
      {show("revenue_per_session") && revenuePerSession.length > 0 && (
        <SectionCard title="Revenue Per Session" subtitle="Revenue efficiency by traffic source">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Source / Medium</th>
                  <th className="text-right px-4 py-3 font-medium">Sessions</th>
                  <th className="text-right px-4 py-3 font-medium">Total Revenue</th>
                  <th className="text-right px-6 py-3 font-medium">Rev / Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {revenuePerSession.map((rps, i) => (
                  <tr key={`${rps.source}-${rps.medium}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{rps.source} / {rps.medium}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(rps.sessions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(rps.totalRevenue)}</td>
                    <td className="px-6 py-3 text-right"><span className="font-semibold text-emerald-600">{formatCurrency(rps.revenuePerSession)}</span></td>
                  </tr>
                ))}
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
