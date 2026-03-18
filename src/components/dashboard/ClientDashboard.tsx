"use client";

import { useState, useMemo } from "react";
import { SemrushSection } from "./SemrushSection";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";
import { GoogleAdsSection } from "./GoogleAdsSection";
import { getDateRange } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
}

interface ClientDashboardProps {
  client: Client;
  period: string;
}

const periods = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "6m", label: "6m" },
  { value: "custom", label: "Custom" },
];

type Tab = "seo" | "web" | "paid" | "googleads";

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDefaultTab(client: Client): Tab {
  if (client.semrushDomain) return "seo";
  if (client.ga4PropertyId) return "web";
  if (client.metaAccountId) return "paid";
  if (client.googleAdsCustomerId) return "googleads";
  return "seo";
}

export function ClientDashboard({ client, period: initialPeriod }: ClientDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>(() => getDefaultTab(client));

  const today = toDateInputValue(new Date());
  const thirtyDaysAgo = toDateInputValue(new Date(Date.now() - 30 * 86400000));
  const [customStart, setCustomStart] = useState(thirtyDaysAgo);
  const [customEnd, setCustomEnd] = useState(today);

  const { startDate, endDate } = useMemo(() => {
    if (period === "custom") return { startDate: customStart, endDate: customEnd };
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    { id: "seo", label: "SEO / SemRush", available: !!client.semrushDomain },
    { id: "web", label: "Web Analytics (GA4)", available: !!client.ga4PropertyId },
    { id: "paid", label: "Paid Social (Meta)", available: !!client.metaAccountId },
    { id: "googleads", label: "Paid Search (Google Ads)", available: !!client.googleAdsCustomerId },
  ];

  return (
    <div>
      {/* Tab bar + date controls */}
      <div className="border-b border-slate-200 flex items-center justify-between mb-10">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.available && setActiveTab(tab.id)}
              disabled={!tab.available}
              className={cn(
                "px-6 py-4 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap",
                activeTab === tab.id && tab.available
                  ? "border-indigo-600 text-indigo-700"
                  : tab.available
                  ? "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  : "border-transparent text-slate-300 cursor-not-allowed"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1 pb-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                period === p.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              {p.value === "custom" && <Calendar className="h-3 w-3" />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range picker */}
      {period === "custom" && (
        <div className="flex items-center gap-3 mb-8 px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 w-fit">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-500 font-medium">Custom range</span>
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-sm text-slate-700 bg-transparent focus:outline-none"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-sm text-slate-700 bg-transparent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Section content */}
      {activeTab === "seo" && client.semrushDomain ? (
        <SemrushSection domain={client.semrushDomain} startDate={startDate} endDate={endDate} />
      ) : activeTab === "seo" ? (
        <NotConfigured
          name="SEO / SemRush"
          description="Add a SemRush domain in client settings to see organic traffic, keyword rankings and traffic value"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "web" && client.ga4PropertyId ? (
        <GA4Section propertyId={client.ga4PropertyId} startDate={startDate} endDate={endDate} />
      ) : activeTab === "web" ? (
        <NotConfigured
          name="Web Analytics (GA4)"
          description="Add a GA4 Property ID in client settings to see sessions, users and page analytics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "paid" && client.metaAccountId ? (
        <MetaSection clientId={client.id} startDate={startDate} endDate={endDate} />
      ) : activeTab === "paid" ? (
        <NotConfigured
          name="Paid Social (Meta)"
          description="Add a Meta Ads account ID in client settings to see spend, impressions, and campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "googleads" && client.googleAdsCustomerId ? (
        <GoogleAdsSection customerId={client.googleAdsCustomerId} startDate={startDate} endDate={endDate} />
      ) : activeTab === "googleads" ? (
        <NotConfigured
          name="Paid Search (Google Ads)"
          description="Add a Google Ads customer ID in client settings to see spend, clicks, conversions and ROAS"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}
    </div>
  );
}

function NotConfigured({
  name,
  description,
  settingsHref,
}: {
  name: string;
  description: string;
  settingsHref: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
        <Calendar className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-slate-800 font-semibold text-lg">{name} not configured</p>
      <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">{description}</p>
      <a
        href={settingsHref}
        className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
      >
        Configure in settings
      </a>
    </div>
  );
}
