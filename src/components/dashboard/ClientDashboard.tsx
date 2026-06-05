"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RefreshDataButton } from "@/components/ui/RefreshDataButton";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";
import { GoogleAdsSection } from "./GoogleAdsSection";
import { SearchConsoleSection } from "./SearchConsoleSection";
import { OverviewSection } from "./OverviewSection";
import { SignalsSection } from "./SignalsSection";
import { ActionQueueSection } from "./ActionQueueSection";
import { FinancialsSection } from "./FinancialsSection";
import { EcommerceSection } from "./EcommerceSection";
import { TikTokSection } from "./TikTokSection";
import { MicrosoftAdsSection } from "./MicrosoftAdsSection";
import { CoreWebVitalsSection } from "./CoreWebVitalsSection";
import { LinkedInSection } from "./LinkedInSection";
import { KlaviyoSection } from "./KlaviyoSection";
import { GoalsSection } from "./GoalsSection";
import { HubSpotSection } from "./HubSpotSection";
import { YouTubeSection } from "./YouTubeSection";
import { ClientStatusControl } from "@/components/clients/ClientStatusControl";
import { CallRailSection } from "./CallRailSection";
import { ActionsSection } from "./ActionsSection";
import { CommunicationsSection } from "./CommunicationsSection";
import { PortalThreadsPanel } from "./PortalThreadsPanel";
import { StrategyDocumentPanel } from "./StrategyDocumentPanel";
import { MeetingBriefingPanel } from "./MeetingBriefingPanel";
import { SectionErrorBoundary } from "./shared/SectionErrorBoundary";
import { HubSection } from "./HubSection";
import { getDateRange, buildCrossContextString } from "@/lib/utils";
import type { PlatformSummary } from "@/lib/utils";
import { Calendar, Star } from "lucide-react";
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
  /** JSON string — see SignalConfig in `src/lib/signals/types.ts`. */
  signalConfig?: string | null;
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

type Tab =
  | "hub"
  | "signals"
  | "overview"
  | "seo"
  | "web"
  | "paid"
  | "googleads"
  | "searchconsole"
  | "ecommerce"
  | "tiktok"
  | "microsoftads"
  | "cwv"
  | "linkedin"
  | "klaviyo"
  | "goals"
  | "hubspot"
  | "youtube"
  | "callrail"
  | "actions"
  | "communications"
  | "strategy"
  | "financials";

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

const VALID_TABS: Tab[] = [
  "hub",
  "signals",
  "overview",
  "seo",
  "web",
  "paid",
  "googleads",
  "searchconsole",
  "ecommerce",
  "tiktok",
  "microsoftads",
  "cwv",
  "linkedin",
  "klaviyo",
  "goals",
  "hubspot",
  "youtube",
  "callrail",
  "actions",
  "communications",
  "strategy",
  "financials",
];

function getDefaultTab(_client: Client): Tab {
  return "hub";
}

export function ClientDashboard({
  client,
  period: initialPeriod,
  userRole,
  permissions = [],
}: ClientDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [period, setPeriod] = useState(initialPeriod);

  // Initialise active tab from ?tab= URL param if valid, else default.
  const initialTab = ((): Tab => {
    const fromUrl = searchParams?.get("tab") as Tab | null;
    return fromUrl && (VALID_TABS as string[]).includes(fromUrl) ? fromUrl : getDefaultTab(client);
  })();

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const tabsNavRef = useRef<HTMLElement | null>(null);

  // Favourite (pinned) tabs — persisted per-client in localStorage so each client
  // can have its own most-used set. "hub" is always first and not pinnable.
  const favKey = `clientDashboardFavTabs:${client.id}`;
  const [favTabs, setFavTabs] = useState<Set<Tab>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(favKey);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as Tab[];
      return new Set(arr.filter((t) => (VALID_TABS as string[]).includes(t)));
    } catch {
      return new Set();
    }
  });

  const toggleFav = useCallback(
    (tabId: Tab) => {
      setFavTabs((prev) => {
        const next = new Set(prev);
        if (next.has(tabId)) next.delete(tabId);
        else next.add(tabId);
        try {
          window.localStorage.setItem(favKey, JSON.stringify(Array.from(next)));
        } catch {
          /* ignore quota errors */
        }
        return next;
      });
    },
    [favKey],
  );

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setTabTransitioning(true);
      setActiveTab(tab);
      // Persist active tab to URL so refresh + back-button work as expected.
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setTimeout(() => setTabTransitioning(false), 200);
    },
    [router, pathname, searchParams],
  );

  // Sync state if user navigates with browser back/forward to a different ?tab=.
  useEffect(() => {
    const fromUrl = searchParams?.get("tab") as Tab | null;
    if (fromUrl && (VALID_TABS as string[]).includes(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
    // We deliberately don't depend on activeTab here — only react to URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-scroll active tab into view (matters on mobile where the tab bar overflows).
  useEffect(() => {
    const el = tabsNavRef.current?.querySelector<HTMLButtonElement>(`#tab-${activeTab}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  const LEAD_STATUSES = ["lead", "qualifying", "proposal_sent", "negotiating"];
  const CLOSED_STATUSES = ["churned", "lost"];
  const LEAD_ALLOWED_TABS = ["hub", "seo", "competitors"];
  const isInLeadFunnel = LEAD_STATUSES.includes(client.status ?? "active");
  const isClosed = CLOSED_STATUSES.includes(client.status ?? "active");
  const isRestricted = isInLeadFunnel || isClosed;

  // Tab visibility: if the role has any "tab:" permissions, restrict to only those tabs
  const tabPermissions = permissions.filter((p) => p.startsWith("tab:")).map((p) => p.slice(4));
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
        fetch(
          `/api/google-ads?customerId=${encodeURIComponent(client.googleAdsCustomerId)}&startDate=${startDate}&endDate=${endDate}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json?.overview) {
              const o = json.overview;
              summaries.push({
                platform: "Google Ads",
                metrics: {
                  spend: `£${(o.costMicros / 1e6).toFixed(0)}`,
                  clicks: o.clicks,
                  conversions: o.conversions,
                  ROAS:
                    o.conversionsValue > 0 && o.costMicros > 0
                      ? `${(o.conversionsValue / (o.costMicros / 1e6)).toFixed(2)}×`
                      : "N/A",
                },
              });
            }
          })
          .catch(() => {}),
      );
    }
    if (client.metaAccountId) {
      fetches.push(
        fetch(
          `/api/meta?clientId=${encodeURIComponent(client.id)}&startDate=${startDate}&endDate=${endDate}&type=overview`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json?.totalSpend != null) {
              const o = json;
              summaries.push({
                platform: "Meta Ads",
                metrics: {
                  spend: `£${o.totalSpend?.toFixed(0) ?? 0}`,
                  clicks: o.totalClicks ?? 0,
                  conversions: o.totalConversions ?? 0,
                  ROAS: `${(o.avgRoas ?? 0).toFixed(2)}×`,
                },
              });
            }
          })
          .catch(() => {}),
      );
    }
    if (client.ga4PropertyId) {
      fetches.push(
        fetch(
          `/api/ga4?propertyId=${encodeURIComponent(client.ga4PropertyId)}&startDate=${startDate}&endDate=${endDate}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json) {
              summaries.push({
                platform: "GA4",
                metrics: {
                  sessions: json.sessions ?? 0,
                  users: json.users ?? 0,
                  bounceRate: `${(json.bounceRate ?? 0).toFixed(1)}%`,
                  conversionRate: `${(json.conversionRate ?? 0).toFixed(2)}%`,
                },
              });
            }
          })
          .catch(() => {}),
      );
    }
    if (client.searchConsoleSiteUrl) {
      fetches.push(
        fetch(
          `/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl)}&startDate=${startDate}&endDate=${endDate}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json) {
              summaries.push({
                platform: "Search Console",
                metrics: {
                  clicks: json.clicks ?? 0,
                  impressions: json.impressions ?? 0,
                  CTR: `${((json.ctr ?? 0) * 100).toFixed(2)}%`,
                  avgPosition: (json.position ?? 0).toFixed(1),
                },
              });
            }
          })
          .catch(() => {}),
      );
    }
    Promise.all(fetches).then(() => {
      if (summaries.length < 2) {
        setCrossCtx({});
        return;
      }
      const ctx: Record<string, string> = {};
      for (const s of summaries) {
        ctx[s.platform] = buildCrossContextString(summaries, s.platform);
      }
      // Also build one keyed by section type identifiers used in the components
      const keyMap: Record<string, string> = {
        "Google Ads": "googleads",
        "Meta Ads": "meta",
        GA4: "ga4",
        "Search Console": "searchconsole",
      };
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
    { id: "seo", label: "SEO", available: !!client.searchConsoleSiteUrl },
    { id: "web", label: "Web Analytics (GA4)", available: !!client.ga4PropertyId },
    { id: "searchconsole", label: "Search Console", available: !!client.searchConsoleSiteUrl },
    { id: "paid", label: "Paid Social (Meta)", available: !!client.metaAccountId },
    { id: "googleads", label: "Paid Search (Google Ads)", available: !!client.googleAdsCustomerId },
    { id: "tiktok", label: "TikTok Ads", available: !!client.tiktokAdvertiserId },
    { id: "microsoftads", label: "Microsoft Ads", available: !!client.microsoftAdsAccountId },
    {
      id: "ecommerce",
      label: "E-Commerce",
      available: !!(client.woocommerceUrl || client.shopifyStoreDomain),
    },
    { id: "cwv", label: "Core Web Vitals", available: !!(client.cwvUrl || client.website) },
    { id: "linkedin", label: "LinkedIn Ads", available: !!client.linkedinAccountId },
    { id: "klaviyo", label: "Email (Klaviyo)", available: !!client.klaviyoApiKey },
    { id: "goals", label: "Goals & KPIs", available: true },
    { id: "hubspot", label: "HubSpot CRM", available: !!client.hubspotAccessToken },
    { id: "youtube", label: "YouTube", available: !!client.youtubeChannelId },
    { id: "callrail", label: "CallRail", available: !!client.callrailAccountId },
    { id: "actions", label: "Actions", available: true },
    { id: "communications", label: "Communications", available: true },
    { id: "strategy", label: "Strategy", available: true },
    { id: "financials", label: "Financials", available: true },
  ]
    .map((tab) => ({
      ...tab,
      // Lead funnel: Hub + SEMrush + Competitors. Closed: Hub only. Active: all.
      available:
        tab.available &&
        (!hasTabRestrictions || tabPermissions.includes(tab.id)) &&
        (!isInLeadFunnel || LEAD_ALLOWED_TABS.includes(tab.id)) &&
        (!isClosed || tab.id === "hub"),
    }))
    .filter((tab) => tab.available)
    // Sort: Hub stays first, then pinned favourites (preserving original order), then the rest.
    .sort((a, b) => {
      if (a.id === "hub") return -1;
      if (b.id === "hub") return 1;
      const aFav = favTabs.has(a.id as Tab) ? 0 : 1;
      const bFav = favTabs.has(b.id as Tab) ? 0 : 1;
      return aFav - bFav;
    }) as { id: Tab; label: string; available: boolean }[];

  return (
    <div>
      {/* Status banner — shown for non-active clients */}
      {isRestricted && (
        <div
          style={{
            padding: "12px 18px",
            marginBottom: 20,
            borderRadius: 12,
            background: isClosed ? "rgba(100,116,139,0.06)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${isClosed ? "rgba(100,116,139,0.2)" : "rgba(245,158,11,0.25)"}`,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            {isClosed
              ? `This client is ${client.status === "churned" ? "churned" : "marked as lost"} — only the Hub is available.`
              : "This prospect is in the lead pipeline — Hub and SEO are available. Mark as Active once signed."}
          </span>
        </div>
      )}

      {/* Tab bar + date controls */}
      <div className="tabs-bar">
        <nav
          ref={tabsNavRef}
          className="tabs-nav"
          role="tablist"
          aria-label="Dashboard sections"
          onKeyDown={(e) => {
            if (
              e.key !== "ArrowLeft" &&
              e.key !== "ArrowRight" &&
              e.key !== "Home" &&
              e.key !== "End"
            )
              return;
            e.preventDefault();
            const idx = tabs.findIndex((t) => t.id === activeTab);
            if (idx === -1) return;
            let nextIdx = idx;
            if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
            if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
            if (e.key === "Home") nextIdx = 0;
            if (e.key === "End") nextIdx = tabs.length - 1;
            const nextTab = tabs[nextIdx];
            if (!nextTab) return;
            handleTabChange(nextTab.id);
            // Move focus to the newly active tab so keyboard users can keep arrowing.
            requestAnimationFrame(() => {
              const el = tabsNavRef.current?.querySelector<HTMLButtonElement>(`#tab-${nextTab.id}`);
              el?.focus();
            });
          }}
        >
          {tabs.map((tab) => {
            const isFav = favTabs.has(tab.id);
            const canPin = tab.id !== "hub";
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tab-panel-${tab.id}`}
                aria-label={`${tab.label} tab${isFav ? " (pinned)" : ""}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={cn(
                  "tab-btn",
                  activeTab === tab.id && "active",
                  isFav && "tab-btn-pinned",
                )}
              >
                {tab.label}
                {canPin && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={isFav ? `Unpin ${tab.label}` : `Pin ${tab.label}`}
                    title={isFav ? "Unpin tab" : "Pin tab"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(tab.id);
                    }}
                    className={cn("tab-pin-btn", isFav && "tab-pin-btn-active")}
                  >
                    <Star
                      style={{ width: 12, height: 12 }}
                      fill={isFav ? "currentColor" : "none"}
                      strokeWidth={isFav ? 0 : 2}
                    />
                  </span>
                )}
              </button>
            );
          })}
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
          <RefreshDataButton
            prefixes={[
              `ga4:${client.id}`,
              `meta:${client.metaAccountId ?? client.id}`,
              `googleads:${client.googleAdsCustomerId ?? client.id}`,
              `searchconsole:${client.searchConsoleSiteUrl ?? client.id}`,
              `tiktok:${client.tiktokAdvertiserId ?? client.id}`,
              `microsoftads:${client.microsoftAdsAccountId ?? client.id}`,
              `linkedin:${client.linkedinAccountId ?? client.id}`,
              `klaviyo:${client.id}`,
              `youtube:${client.id}`,
              `hubspot:${client.id}`,
              `callrail:${client.id}`,
              `woocommerce:${client.id}`,
              `shopify:${client.id}`,
              `cwv:${client.cwvUrl ?? client.id}`,
            ]}
          />
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
        style={{
          opacity: tabTransitioning ? 0.5 : 1,
          pointerEvents: tabTransitioning ? "none" : "auto",
          transition: "opacity 0.2s",
        }}
      >
        <SectionErrorBoundary>
          {activeTab === "hub" && (
            <HubSection clientId={client.id} clientSlug={client.slug} clientName={client.name} />
          )}

          {activeTab === "signals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <ActionQueueSection clientId={client.id} />
              <SignalsSection client={client} startDate={startDate} endDate={endDate} />
            </div>
          )}

          {activeTab === "overview" && (
            <OverviewSection client={client} startDate={startDate} endDate={endDate} />
          )}

          {activeTab === "seo" && client.searchConsoleSiteUrl ? (
            <SearchConsoleSection
              siteUrl={client.searchConsoleSiteUrl}
              startDate={startDate}
              endDate={endDate}
              googleAdsCustomerId={client.googleAdsCustomerId}
              crossPlatformContext={crossCtx.searchconsole}
            />
          ) : activeTab === "seo" ? (
            <NotConfigured
              name="SEO"
              description="Add a Search Console site URL in client settings to see clicks, impressions, CTR and keyword rankings"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "web" && client.ga4PropertyId ? (
            <GA4Section
              propertyId={client.ga4PropertyId}
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.ga4}
            />
          ) : activeTab === "web" ? (
            <NotConfigured
              name="Web Analytics (GA4)"
              description="Add a GA4 Property ID in client settings to see sessions, users and page analytics"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "paid" && client.metaAccountId ? (
            <MetaSection
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.meta}
              clickFraudToken={client.clickFraudToken}
              signalConfig={client.signalConfig}
            />
          ) : activeTab === "paid" ? (
            <NotConfigured
              name="Paid Social (Meta)"
              description="Add a Meta Ads account ID in client settings to see spend, impressions, and campaign performance"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "googleads" && client.googleAdsCustomerId ? (
            <GoogleAdsSection
              customerId={client.googleAdsCustomerId}
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.googleads}
              clickFraudToken={client.clickFraudToken}
              signalConfig={client.signalConfig}
            />
          ) : activeTab === "googleads" ? (
            <NotConfigured
              name="Paid Search (Google Ads)"
              description="Add a Google Ads customer ID in client settings to see spend, clicks, conversions and ROAS"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "searchconsole" && client.searchConsoleSiteUrl ? (
            <SearchConsoleSection
              siteUrl={client.searchConsoleSiteUrl}
              startDate={startDate}
              endDate={endDate}
              googleAdsCustomerId={client.googleAdsCustomerId}
              crossPlatformContext={crossCtx.searchconsole}
            />
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
            <TikTokSection
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.combined}
            />
          ) : activeTab === "tiktok" ? (
            <NotConfigured
              name="TikTok Ads"
              description="Add a TikTok Advertiser ID in client settings to see spend, video views, and campaign performance"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "microsoftads" && client.microsoftAdsAccountId ? (
            <MicrosoftAdsSection
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.combined}
            />
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
            <KlaviyoSection
              clientId={client.id}
              clientName={client.name}
              startDate={startDate}
              endDate={endDate}
              crossPlatformContext={crossCtx.combined}
            />
          ) : activeTab === "klaviyo" ? (
            <NotConfigured
              name="Email Marketing (Klaviyo)"
              description="Add a Klaviyo API key in client settings to see email campaign performance"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "goals" && <GoalsSection clientId={client.id} />}

          {activeTab === "hubspot" && client.hubspotAccessToken ? (
            <HubSpotSection
              clientId={client.id}
              clientName={client.name}
              crossPlatformContext={crossCtx.combined}
            />
          ) : activeTab === "hubspot" ? (
            <NotConfigured
              name="HubSpot CRM"
              description="Add your HubSpot access token in client settings to see contacts, deals and pipeline value"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "youtube" && client.youtubeChannelId ? (
            <YouTubeSection
              clientId={client.id}
              clientName={client.name}
              crossPlatformContext={crossCtx.combined}
            />
          ) : activeTab === "youtube" ? (
            <NotConfigured
              name="YouTube Analytics"
              description="Add your YouTube Channel ID in client settings to see views, watch time and top videos"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "callrail" && client.callrailAccountId ? (
            <CallRailSection
              clientId={client.id}
              clientName={client.name}
              crossPlatformContext={crossCtx.combined}
            />
          ) : activeTab === "callrail" ? (
            <NotConfigured
              name="CallRail"
              description="Add your CallRail account ID and API key in client settings to see call tracking data"
              settingsHref={`/clients/${client.slug}/settings`}
            />
          ) : null}

          {activeTab === "actions" && <ActionsSection clientId={client.id} />}

          {activeTab === "communications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <PortalThreadsPanel clientId={client.id} />
              <CommunicationsSection clientId={client.id} />
            </div>
          )}

          {activeTab === "strategy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <StrategyDocumentPanel
                clientId={client.id}
                clientName={client.name}
                crossPlatformData={crossCtx as Record<string, unknown>}
              />
              <MeetingBriefingPanel clientId={client.id} clientName={client.name} />
            </div>
          )}

          {activeTab === "financials" && <FinancialsSection clientId={client.id} />}
        </SectionErrorBoundary>
      </div>
      {/* end tab content wrapper */}
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
