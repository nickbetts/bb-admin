"use client";

import { useState, useMemo } from "react";
import { SemrushSection } from "./SemrushSection";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";
import { GoogleAdsSection } from "./GoogleAdsSection";
import { SearchConsoleSection } from "./SearchConsoleSection";
import { OverviewSection } from "./OverviewSection";
import { SignalsSection } from "./SignalsSection";
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
  searchConsoleSiteUrl: string | null;
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

type Tab = "signals" | "overview" | "seo" | "web" | "paid" | "googleads" | "searchconsole";

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDefaultTab(_client: Client): Tab {
  return "overview";
}

export function ClientDashboard({ client, period: initialPeriod }: ClientDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>(() => getDefaultTab(client));

  const today = toDateInputValue(new Date());
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [customEnd, setCustomEnd] = useState(today);

  const { startDate, endDate } = useMemo(() => {
    if (period === "custom") return { startDate: customStart, endDate: customEnd };
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    { id: "signals", label: "Signals", available: true },
    { id: "overview", label: "Overview", available: true },
    { id: "seo", label: "SEO / SemRush", available: !!client.semrushDomain },
    { id: "web", label: "Web Analytics (GA4)", available: !!client.ga4PropertyId },
    { id: "searchconsole", label: "Search Console", available: !!client.searchConsoleSiteUrl },
    { id: "paid", label: "Paid Social (Meta)", available: !!client.metaAccountId },
    { id: "googleads", label: "Paid Search (Google Ads)", available: !!client.googleAdsCustomerId },
  ];

  return (
    <div>
      {/* Tab bar + date controls */}
      <div className="tabs-bar">
        <nav className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.available && setActiveTab(tab.id)}
              disabled={!tab.available}
              className={cn("tab-btn", activeTab === tab.id && tab.available && "active")}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="period-pills">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn("period-pill", period === p.value && "active")}
            >
              {p.value === "custom" && <Calendar style={{ width: 12, height: 12 }} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range picker */}
      {period === "custom" && (
        <div className="custom-range-bar">
          <Calendar style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
          <span style={{ fontWeight: 500, color: "var(--text-2)" }}>Custom range</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span style={{ color: "var(--text-3)" }}>→</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={today}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {/* Section content */}
      {activeTab === "signals" && (
        <SignalsSection client={client} startDate={startDate} endDate={endDate} />
      )}

      {activeTab === "overview" && (
        <OverviewSection client={client} startDate={startDate} endDate={endDate} />
      )}

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
        <MetaSection clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} />
      ) : activeTab === "paid" ? (
        <NotConfigured
          name="Paid Social (Meta)"
          description="Add a Meta Ads account ID in client settings to see spend, impressions, and campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "googleads" && client.googleAdsCustomerId ? (
        <GoogleAdsSection customerId={client.googleAdsCustomerId} clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} />
      ) : activeTab === "googleads" ? (
        <NotConfigured
          name="Paid Search (Google Ads)"
          description="Add a Google Ads customer ID in client settings to see spend, clicks, conversions and ROAS"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "searchconsole" && client.searchConsoleSiteUrl ? (
        <SearchConsoleSection siteUrl={client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} />
      ) : activeTab === "searchconsole" ? (
        <NotConfigured
          name="Search Console"
          description="Add a Search Console site URL in client settings to see clicks, impressions, CTR and keyword rankings"
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
    <div className="empty-state">
      <div className="empty-state-icon">
        <Calendar style={{ width: 24, height: 24 }} />
      </div>
      <p className="empty-state-title">{name} not configured</p>
      <p className="empty-state-desc">{description}</p>
      <a href={settingsHref} className="btn btn-primary" style={{ marginTop: 28 }}>
        Configure in settings
      </a>
    </div>
  );
}
