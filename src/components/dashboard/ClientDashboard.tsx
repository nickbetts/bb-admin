"use client";

import { useState, useMemo, useEffect } from "react";
import { SemrushSection } from "./SemrushSection";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";
import { GoogleAdsSection } from "./GoogleAdsSection";
import { SearchConsoleSection } from "./SearchConsoleSection";
import { OverviewSection } from "./OverviewSection";
import { SignalsSection } from "./SignalsSection";
import { EcommerceSection } from "./EcommerceSection";
import { TikTokSection } from "./TikTokSection";
import { MicrosoftAdsSection } from "./MicrosoftAdsSection";
import { CoreWebVitalsSection } from "./CoreWebVitalsSection";
import { AiChatPanel } from "./AiChatPanel";
import { LinkedInSection } from "./LinkedInSection";
import { KlaviyoSection } from "./KlaviyoSection";
import { GoalsSection } from "./GoalsSection";
import { HubSpotSection } from "./HubSpotSection";
import { YouTubeSection } from "./YouTubeSection";
import { CallRailSection } from "./CallRailSection";
import { ActionsSection } from "./ActionsSection";
import { CommunicationsSection } from "./CommunicationsSection";
import { CompetitorIntelligenceSection } from "./CompetitorIntelligenceSection";
import { StrategyDocumentPanel } from "./StrategyDocumentPanel";
import { MeetingBriefingPanel } from "./MeetingBriefingPanel";
import { SectionErrorBoundary } from "./shared/SectionErrorBoundary";
import { HubSection } from "./HubSection";
import { getDateRange, buildCrossContextString } from "@/lib/utils";
import type { PlatformSummary } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  semrushDomain: string | null;
  semrushProjectId?: number | null;
  semrushCampaignIds?: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  woocommerceUrl?: string | null;
  shopifyStoreDomain?: string | null;
  tiktokAdvertiserId?: string | null;
  microsoftAdsAccountId?: string | null;
  cwvUrl?: string | null;
  linkedinAccountId?: string | null;
  linkedinAccessToken?: string | null;
  klaviyoApiKey?: string | null;
  // Phase 3
  hubspotAccessToken?: string | null;
  youtubeChannelId?: string | null;
  callrailAccountId?: string | null;
  competitorDomains?: string | null;
  clickFraudToken?: string | null;
  status?: string;
}

interface ClientDashboardProps {
  client: Client;
  period: string;
  userRole?: string;
  permissions?: string[];
}

const periods = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "6m", label: "6m" },
  { value: "custom", label: "Custom" },
];

type Tab = "hub" | "signals" | "overview" | "seo" | "web" | "paid" | "googleads" | "searchconsole" | "ecommerce" | "tiktok" | "microsoftads" | "cwv" | "linkedin" | "klaviyo" | "goals" | "hubspot" | "youtube" | "callrail" | "actions" | "communications" | "competitors" | "strategy";

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDefaultTab(_client: Client): Tab {
  return "hub";
}

function ConvertToActiveButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  async function handleConvert() {
    setLoading(true);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    window.location.reload();
  }
  return (
    <button
      onClick={handleConvert}
      disabled={loading}
      className="btn btn-primary btn-sm"
      style={{ flexShrink: 0 }}
    >
      {loading ? "Converting…" : "Convert to Active"}
    </button>
  );
}

export function ClientDashboard({ client, period: initialPeriod, userRole, permissions = [] }: ClientDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>(() => getDefaultTab(client));
  const [tabTransitioning, setTabTransitioning] = useState(false);

  function handleTabChange(tab: Tab) {
    setTabTransitioning(true);
    setActiveTab(tab);
    setTimeout(() => setTabTransitioning(false), 200);
  }

  const isLead = client.status === "lead";

  // Tab visibility: if the role has any "tab:" permissions, restrict to only those tabs
  const tabPermissions = permissions.filter(p => p.startsWith("tab:")).map(p => p.slice(4));
  const hasTabRestrictions = tabPermissions.length > 0;

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

  // ─── Cross-platform context (lightweight overview fetch for AI enrichment) ──
  const [crossCtx, setCrossCtx] = useState<Record<string, string>>({});

  useEffect(() => {
    const summaries: PlatformSummary[] = [];
    const fetches: Promise<void>[] = [];

    if (client.googleAdsCustomerId) {
      fetches.push(
        fetch(`/api/google-ads?customerId=${encodeURIComponent(client.googleAdsCustomerId)}&startDate=${startDate}&endDate=${endDate}`)
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json?.overview) {
              const o = json.overview;
              summaries.push({ platform: "Google Ads", metrics: { spend: `£${(o.costMicros / 1e6).toFixed(0)}`, clicks: o.clicks, conversions: o.conversions, ROAS: o.conversionsValue > 0 && o.costMicros > 0 ? `${(o.conversionsValue / (o.costMicros / 1e6)).toFixed(2)}×` : "N/A" } });
            }
          })
          .catch(() => {})
      );
    }
    if (client.metaAccountId) {
      fetches.push(
        fetch(`/api/meta?clientId=${encodeURIComponent(client.id)}&startDate=${startDate}&endDate=${endDate}&type=overview`)
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json?.totalSpend != null) {
              const o = json;
              summaries.push({ platform: "Meta Ads", metrics: { spend: `£${o.totalSpend?.toFixed(0) ?? 0}`, clicks: o.totalClicks ?? 0, conversions: o.totalConversions ?? 0, ROAS: `${(o.avgRoas ?? 0).toFixed(2)}×` } });
            }
          })
          .catch(() => {})
      );
    }
    if (client.ga4PropertyId) {
      fetches.push(
        fetch(`/api/ga4?propertyId=${encodeURIComponent(client.ga4PropertyId)}&startDate=${startDate}&endDate=${endDate}`)
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json) {
              summaries.push({ platform: "GA4", metrics: { sessions: json.sessions ?? 0, users: json.users ?? 0, bounceRate: `${(json.bounceRate ?? 0).toFixed(1)}%`, conversionRate: `${(json.conversionRate ?? 0).toFixed(2)}%` } });
            }
          })
          .catch(() => {})
      );
    }
    if (client.searchConsoleSiteUrl) {
      fetches.push(
        fetch(`/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl)}&startDate=${startDate}&endDate=${endDate}`)
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json) {
              summaries.push({ platform: "Search Console", metrics: { clicks: json.clicks ?? 0, impressions: json.impressions ?? 0, CTR: `${((json.ctr ?? 0) * 100).toFixed(2)}%`, avgPosition: (json.position ?? 0).toFixed(1) } });
            }
          })
          .catch(() => {})
      );
    }
    if (client.semrushDomain) {
      fetches.push(
        fetch(`/api/semrush?domain=${encodeURIComponent(client.semrushDomain)}`)
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json?.overview) {
              const o = json.overview;
              summaries.push({ platform: "SEMrush", metrics: { organicTraffic: o.organicTraffic ?? 0, organicKeywords: o.organicKeywords ?? 0, organicCost: `£${(o.organicCost ?? 0).toFixed(0)}` } });
            }
          })
          .catch(() => {})
      );
    }

    Promise.all(fetches).then(() => {
      if (summaries.length < 2) { setCrossCtx({}); return; }
      const ctx: Record<string, string> = {};
      for (const s of summaries) {
        ctx[s.platform] = buildCrossContextString(summaries, s.platform);
      }
      // Also build one keyed by section type identifiers used in the components
      const keyMap: Record<string, string> = { "Google Ads": "googleads", "Meta Ads": "meta", "GA4": "ga4", "Search Console": "searchconsole", "SEMrush": "semrush" };
      const result: Record<string, string> = {};
      for (const [platName, ctx_str] of Object.entries(ctx)) {
        const key = keyMap[platName];
        if (key) result[key] = ctx_str;
      }
      // Build a combined context for channels not in the main set (TikTok, Microsoft, LinkedIn, Klaviyo)
      const combined = buildCrossContextString(summaries, "");
      if (combined) result["combined"] = combined;
      setCrossCtx(result);
    });
  }, [client, startDate, endDate]);

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    { id: "hub", label: "Hub", available: true },
    { id: "signals", label: "Signals", available: true },
    { id: "overview", label: "Overview", available: true },
    { id: "seo", label: "SEO / SemRush", available: !!client.semrushDomain },
    { id: "web", label: "Web Analytics (GA4)", available: !!client.ga4PropertyId },
    { id: "searchconsole", label: "Search Console", available: !!client.searchConsoleSiteUrl },
    { id: "paid", label: "Paid Social (Meta)", available: !!client.metaAccountId },
    { id: "googleads", label: "Paid Search (Google Ads)", available: !!client.googleAdsCustomerId },
    { id: "tiktok", label: "TikTok Ads", available: !!client.tiktokAdvertiserId },
    { id: "microsoftads", label: "Microsoft Ads", available: !!client.microsoftAdsAccountId },
    { id: "ecommerce", label: "E-Commerce", available: !!(client.woocommerceUrl || client.shopifyStoreDomain) },
    { id: "cwv", label: "Core Web Vitals", available: !!(client.cwvUrl || client.website) },
    { id: "linkedin", label: "LinkedIn Ads", available: !!client.linkedinAccountId },
    { id: "klaviyo", label: "Email (Klaviyo)", available: !!client.klaviyoApiKey },
    { id: "goals", label: "Goals & KPIs", available: true },
    { id: "hubspot", label: "HubSpot CRM", available: !!client.hubspotAccessToken },
    { id: "youtube", label: "YouTube", available: !!client.youtubeChannelId },
    { id: "callrail", label: "CallRail", available: !!client.callrailAccountId },
    { id: "competitors", label: "Competitors", available: true },
    { id: "actions", label: "Actions", available: true },
    { id: "communications", label: "Communications", available: true },
    { id: "strategy", label: "Strategy", available: true },
  ].map((tab) => ({
    ...tab,
    // If the role has tab restrictions, hide tabs not in the allowed set (core tabs always stay visible)
    // Leads only see the Hub tab
    available: tab.available && (!hasTabRestrictions || tabPermissions.includes(tab.id)) && (!isLead || tab.id === "hub"),
  })).filter((tab) => tab.available) as { id: Tab; label: string; available: boolean }[];

  return (
    <div>
      {/* Lead banner */}
      {isLead && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 18px", marginBottom: 20, borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,0.18)", color: "#d97706" }}>LEAD</span>
            <span style={{ fontSize: 13, color: "var(--text-2)" }}>This is a prospect — only the Hub is available. Once signed, convert to active to unlock all channel integrations.</span>
          </div>
          <ConvertToActiveButton clientId={client.id} />
        </div>
      )}

      {/* Tab bar + date controls */}
      <div className="tabs-bar">
        <nav className="tabs-nav" role="tablist" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={cn("tab-btn", activeTab === tab.id && "active")}
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
      <div
        id={`tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={-1}
        style={{ opacity: tabTransitioning ? 0.5 : 1, pointerEvents: tabTransitioning ? "none" : "auto", transition: "opacity 0.2s" }}
      >
      <SectionErrorBoundary>
      {activeTab === "hub" && (
        <HubSection clientId={client.id} clientSlug={client.slug} clientName={client.name} />
      )}

      {activeTab === "signals" && (
        <SignalsSection client={client} startDate={startDate} endDate={endDate} />
      )}

      {activeTab === "overview" && (
        <OverviewSection client={client} startDate={startDate} endDate={endDate} />
      )}

      {activeTab === "seo" && client.semrushDomain ? (
        <SemrushSection domain={client.semrushDomain} projectId={client.semrushProjectId} campaignIds={(() => { try { return JSON.parse(client.semrushCampaignIds ?? "[]") as string[]; } catch { return []; } })()} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.semrush} />
      ) : activeTab === "seo" ? (
        <NotConfigured
          name="SEO / SemRush"
          description="Add a SemRush domain in client settings to see organic traffic, keyword rankings and traffic value"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "web" && client.ga4PropertyId ? (
        <GA4Section propertyId={client.ga4PropertyId} clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.ga4} />
      ) : activeTab === "web" ? (
        <NotConfigured
          name="Web Analytics (GA4)"
          description="Add a GA4 Property ID in client settings to see sessions, users and page analytics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "paid" && client.metaAccountId ? (
        <MetaSection clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.meta} clickFraudToken={client.clickFraudToken} />
      ) : activeTab === "paid" ? (
        <NotConfigured
          name="Paid Social (Meta)"
          description="Add a Meta Ads account ID in client settings to see spend, impressions, and campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "googleads" && client.googleAdsCustomerId ? (
        <GoogleAdsSection customerId={client.googleAdsCustomerId} clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.googleads} clickFraudToken={client.clickFraudToken} />
      ) : activeTab === "googleads" ? (
        <NotConfigured
          name="Paid Search (Google Ads)"
          description="Add a Google Ads customer ID in client settings to see spend, clicks, conversions and ROAS"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "searchconsole" && client.searchConsoleSiteUrl ? (
        <SearchConsoleSection siteUrl={client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} googleAdsCustomerId={client.googleAdsCustomerId} crossPlatformContext={crossCtx.searchconsole} />
      ) : activeTab === "searchconsole" ? (
        <NotConfigured
          name="Search Console"
          description="Add a Search Console site URL in client settings to see clicks, impressions, CTR and keyword rankings"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "ecommerce" && (client.woocommerceUrl || client.shopifyStoreDomain) ? (
        <EcommerceSection
          clientId={client.id}
          platform={client.shopifyStoreDomain ? "shopify" : "woocommerce"}
          startDate={startDate}
          endDate={endDate}
        />
      ) : activeTab === "ecommerce" ? (
        <NotConfigured
          name="E-Commerce"
          description="Add WooCommerce or Shopify credentials in client settings to see order and revenue data"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "tiktok" && client.tiktokAdvertiserId ? (
        <TikTokSection clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "tiktok" ? (
        <NotConfigured
          name="TikTok Ads"
          description="Add a TikTok Advertiser ID in client settings to see spend, video views, and campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "microsoftads" && client.microsoftAdsAccountId ? (
        <MicrosoftAdsSection clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "microsoftads" ? (
        <NotConfigured
          name="Microsoft Ads"
          description="Add a Microsoft Ads account ID in client settings to see Bing search campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "cwv" ? (
        <CoreWebVitalsSection url={(client.cwvUrl || client.website) ?? ""} />
      ) : null}

      {activeTab === "linkedin" && client.linkedinAccountId ? (
        <LinkedInSection
          clientId={client.id}
          clientName={client.name}
          accountId={client.linkedinAccountId}
          accessToken={client.linkedinAccessToken}
          startDate={startDate}
          endDate={endDate}
          crossPlatformContext={crossCtx.combined}
        />
      ) : activeTab === "linkedin" ? (
        <NotConfigured
          name="LinkedIn Ads"
          description="Add a LinkedIn Ads account ID and access token in client settings to see campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "klaviyo" && client.klaviyoApiKey ? (
        <KlaviyoSection clientId={client.id} clientName={client.name} startDate={startDate} endDate={endDate} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "klaviyo" ? (
        <NotConfigured
          name="Email Marketing (Klaviyo)"
          description="Add a Klaviyo API key in client settings to see email campaign performance"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "goals" && (
        <GoalsSection clientId={client.id} />
      )}

      {activeTab === "hubspot" && client.hubspotAccessToken ? (
        <HubSpotSection clientId={client.id} clientName={client.name} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "hubspot" ? (
        <NotConfigured name="HubSpot CRM" description="Add your HubSpot access token in client settings to see contacts, deals and pipeline value" settingsHref={`/clients/${client.slug}/settings`} />
      ) : null}

      {activeTab === "youtube" && client.youtubeChannelId ? (
        <YouTubeSection clientId={client.id} clientName={client.name} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "youtube" ? (
        <NotConfigured name="YouTube Analytics" description="Add your YouTube Channel ID in client settings to see views, watch time and top videos" settingsHref={`/clients/${client.slug}/settings`} />
      ) : null}

      {activeTab === "callrail" && client.callrailAccountId ? (
        <CallRailSection clientId={client.id} clientName={client.name} crossPlatformContext={crossCtx.combined} />
      ) : activeTab === "callrail" ? (
        <NotConfigured name="CallRail" description="Add your CallRail account ID and API key in client settings to see call tracking data" settingsHref={`/clients/${client.slug}/settings`} />
      ) : null}

      {activeTab === "competitors" && (
        <CompetitorIntelligenceSection clientId={client.id} semrushDomain={client.semrushDomain} />
      )}

      {activeTab === "actions" && (
        <ActionsSection clientId={client.id} />
      )}

      {activeTab === "communications" && (
        <CommunicationsSection clientId={client.id} />
      )}

      {activeTab === "strategy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <StrategyDocumentPanel
            clientId={client.id}
            clientName={client.name}
            crossPlatformData={crossCtx as Record<string, unknown>}
          />
          <MeetingBriefingPanel
            clientId={client.id}
            clientName={client.name}
          />
        </div>
      )}

      </SectionErrorBoundary>
      </div>{/* end tab content wrapper */}

      {/* AI Chat panel — always visible when any platform is connected */}
      <AiChatPanel clientId={client.id} clientName={client.name} />
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
