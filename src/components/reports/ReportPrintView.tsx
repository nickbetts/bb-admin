"use client";

import { useEffect, useMemo } from "react";
import { parsePeriodToDateRange, formatDateDisplay, getPreviousPeriod } from "@/lib/utils";
import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { EcommerceSection } from "@/components/dashboard/EcommerceSection";
import { TikTokSection } from "@/components/dashboard/TikTokSection";
import { MicrosoftAdsSection } from "@/components/dashboard/MicrosoftAdsSection";
import { LinkedInSection } from "@/components/dashboard/LinkedInSection";
import { KlaviyoSection } from "@/components/dashboard/KlaviyoSection";
import { GoalsSection } from "@/components/dashboard/GoalsSection";
import { YouTubeSection } from "@/components/dashboard/YouTubeSection";
import { HubSpotSection } from "@/components/dashboard/HubSpotSection";
import { CallRailSection } from "@/components/dashboard/CallRailSection";
import { CoreWebVitalsSection } from "@/components/dashboard/CoreWebVitalsSection";
import { CompetitorIntelligenceSection } from "@/components/dashboard/CompetitorIntelligenceSection";
import { TextSection } from "@/components/reports/TextSection";
import { ScreenshotsSection } from "@/components/reports/ScreenshotsSection";

const SECTION_LABEL_MAP: Record<string, string> = {
  seo: "SEO", web: "Web", ga4: "GA4", paid_social: "Paid Social", meta: "Meta",
  googleads: "Google Ads", searchconsole: "Search Console", ecommerce: "E-Commerce",
  shopify: "Shopify", woocommerce: "WooCommerce", overview: "Overview",
  youtube: "YouTube", hubspot: "HubSpot", callrail: "CallRail", klaviyo: "Klaviyo",
  linkedin: "LinkedIn", tiktok: "TikTok", microsoft_ads: "Microsoft Ads",
};
function formatSectionLabel(key: string): string {
  return SECTION_LABEL_MAP[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

const SECTION_SUBTITLES: Record<string, string> = {
  overview: "High-level performance snapshot across all channels",
  seo: "Organic search visibility via SEMrush",
  web: "Site traffic data via Google Analytics 4",
  paid_social: "Paid social advertising via Meta Ads",
  googleads: "Paid search advertising via Google Ads",
  searchconsole: "Organic search performance via Google Search Console",
  ecommerce: "Online store revenue and order performance",
  tiktok: "TikTok Ads campaign performance",
  microsoft_ads: "Paid search advertising via Microsoft Advertising",
  linkedin: "LinkedIn Ads campaign performance",
  klaviyo: "Email and SMS marketing performance via Klaviyo",
  goals: "Client objectives and progress tracking",
  youtube: "YouTube channel and video analytics",
  hubspot: "CRM pipeline and contact activity via HubSpot",
  callrail: "Call tracking performance via CallRail",
  core_web_vitals: "Page experience metrics from CrUX",
  competitor_intelligence: "Competitor visibility snapshots",
  executive_summary: "AI-generated summary of the full report",
};

interface Section {
  id: string;
  sectionType: string;
  title: string;
  commentary: string | null;
  contentText?: string | null;
  orderIndex: number;
  enabled?: boolean;
  cardConfig?: string | null;
}

interface Screenshot {
  id: string;
  url: string;
  filename: string;
  caption: string | null;
  sectionId?: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
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
  linkedinAccountId?: string | null;
  linkedinAccessToken?: string | null;
  klaviyoApiKey?: string | null;
  youtubeChannelId?: string | null;
  hubspotPortalId?: string | null;
  callrailAccountId?: string | null;
}

interface Report {
  id: string;
  title: string;
  period: string;
  customStartDate?: string | null;
  customEndDate?: string | null;
  compareStartDate?: string | null;
  compareEndDate?: string | null;
  narrativeData?: string | null;
  client: Client;
  sections: Section[];
  screenshots: Screenshot[];
}

export function ReportPrintView({ report, showDescriptions = true }: { report: Report; showDescriptions?: boolean }) {
  const derived = parsePeriodToDateRange(report.period);
  const startDate = report.customStartDate || derived.startDate;
  const endDate = report.customEndDate || derived.endDate;
  const compareStartDate = report.compareStartDate || null;
  const compareEndDate = report.compareEndDate || null;

  const enabledSections = (() => {
    const seenDataTypes = new Set<string>();
    return report.sections
      .filter((s) => s.enabled !== false)
      .filter((s) => {
        // Text sections may legitimately appear more than once (different content each time)
        if (isTextSection(s.sectionType)) return true;
        // Data sections must be unique — deduplicate by sectionType, keeping first occurrence
        if (seenDataTypes.has(s.sectionType)) return false;
        seenDataTypes.add(s.sectionType);
        return true;
      });
  })();

  // Stable parsed array — keeps the reference identity steady across renders.
  const semrushCampaignIds = useMemo<string[]>(() => {
    try { return JSON.parse(report.client.semrushCampaignIds ?? "[]") as string[]; }
    catch { return []; }
  }, [report.client.semrushCampaignIds]);

  // Parse the narrative once so it can be used in the overview section's afterHeader
  const narrativeResult: {
    executiveSummary?: string;
    keyThemes?: string[];
    crossSectionStories?: { sections: string[]; narrative: string }[];
  } | null = (() => {
    if (!report.narrativeData) return null;
    try { return JSON.parse(report.narrativeData); } catch { return null; }
  })();

  const narrativeBlock = narrativeResult ? (
    <div
      style={{
        marginBottom: 20,
        background: "var(--accent-bg)",
        border: "1px solid rgb(99 102 241 / 0.25)",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent-hover)", marginBottom: 12 }}>
        Report Narrative
      </p>
      {narrativeResult.executiveSummary && (
        <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: narrativeResult.keyThemes ? 12 : 0 }}>
          {narrativeResult.executiveSummary}
        </p>
      )}
      {narrativeResult.keyThemes && narrativeResult.keyThemes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: narrativeResult.crossSectionStories ? 12 : 0 }}>
          {narrativeResult.keyThemes.map((theme, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--accent-hover)", background: "rgba(99,102,241,0.12)", padding: "2px 10px", borderRadius: 99 }}>{theme}</span>
          ))}
        </div>
      )}
      {narrativeResult.crossSectionStories && narrativeResult.crossSectionStories.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-hover)", opacity: 0.7, marginBottom: 4 }}>Cross-channel stories</p>
          {narrativeResult.crossSectionStories.map((story, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "8px 12px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-hover)", marginBottom: 3 }}>{story.sections.map(formatSectionLabel).join(" + ")}</p>
              <p style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{story.narrative}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  // Add class that hides the sidebar and resets the app-shell for screen-media
  // PDF rendering (Puppeteer uses screen media, not print media).
  // Signal Puppeteer via data-print-ready after the class is applied.
  useEffect(() => {
    document.body.classList.add("pdf-print-view");
    document.body.setAttribute("data-print-ready", "true");
    return () => {
      document.body.classList.remove("pdf-print-view");
      document.body.removeAttribute("data-print-ready");
    };
  }, []);

  const commentaryBlock = (section: Section) =>
    section.commentary ? (
      <div
        style={{
          background: "var(--accent-bg)",
          border: "1px solid rgb(99 102 241 / 0.25)",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent-hover)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          Commentary
        </p>
        <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {section.commentary}
        </p>
      </div>
    ) : null;

  return (
    <div
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "var(--surface)",
        color: "#1e293b",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "48px 40px",
      }}
    >
      {/* Cover card */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
          marginBottom: 36,
          pageBreakInside: "avoid",
        }}
      >
        <div
          style={{
            background: "var(--gradient-accent)",
            padding: "36px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/primary-logo.svg" alt="i3media" style={{ height: 32, marginBottom: 20 }} />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 8,
                }}
              >
                {report.client.name}
              </p>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {report.title}
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{report.period}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
                {" · vs "}
                {(() => {
                  const prev = (compareStartDate && compareEndDate)
                    ? { startDate: compareStartDate, endDate: compareEndDate }
                    : getPreviousPeriod(startDate, endDate);
                  return `${formatDateDisplay(prev.startDate)} – ${formatDateDisplay(prev.endDate)}`;
                })()}
              </p>
            </div>
            {report.client.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.client.logoUrl}
                alt={report.client.name}
                style={{ height: 48, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }}
              />
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 40px",
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "#64748b",
          }}
        >
          <span>{report.client.website ?? ""}</span>
          <span>
            Prepared{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Sections */}
      {enabledSections.map((section) => {
        const sectionScreenshots = report.screenshots.filter(
          (s) => s.sectionId === section.id
        );

        const screenshotsBlock =
          sectionScreenshots.length > 0 ? (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              {sectionScreenshots.map((ss) => (
                <div
                  key={ss.id}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ss.url}
                    alt={ss.caption ?? ss.filename}
                    style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 400 }}
                  />
                  {ss.caption && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        padding: "7px 12px",
                        background: "var(--bg)",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      {ss.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null;

        // When a report narrative is generated it replaces the overview commentary.
        // Show narrativeBlock for the overview section, fall back to commentaryBlock
        // for non-overview sections (or overview without a narrative).
        const sectionSubtitle = SECTION_SUBTITLES[section.sectionType];
        const afterHeader = (
          <>
            {showDescriptions && sectionSubtitle && (
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{sectionSubtitle}</p>
            )}
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
              {" · vs "}
              {(() => {
                const prev = (compareStartDate && compareEndDate)
                  ? { startDate: compareStartDate, endDate: compareEndDate }
                  : getPreviousPeriod(startDate, endDate);
                return `${formatDateDisplay(prev.startDate)} – ${formatDateDisplay(prev.endDate)}`;
              })()}
            </p>
            {section.sectionType === "overview"
              ? (narrativeBlock ?? commentaryBlock(section))
              : commentaryBlock(section)}
            {screenshotsBlock}
          </>
        );

        const visibleBlocks = section.cardConfig
          ? (() => {
              try {
                const cfg = JSON.parse(section.cardConfig as string);
                return cfg.visibleBlocks as string[] | undefined;
              } catch {
                return undefined;
              }
            })()
          : undefined;

        // Executive summary
        if (section.sectionType === "executive_summary") {
          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              data-section-type={section.sectionType}
              style={{ marginBottom: 64, pageBreakInside: "avoid" }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 24px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: "#fafbfc",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      background: "var(--warning-bg)",
                      color: "var(--warning-text)",
                    }}
                  >
                    ★ {section.title || "Executive Summary"}
                  </span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {section.commentary ? (
                    <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {section.commentary}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                      No executive summary added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Text-only sections
        if (isTextSection(section.sectionType)) {
          if (section.sectionType === "text_screenshots") {
            return (
              <div key={section.id} id={`section-${section.id}`} data-section-type={section.sectionType} style={{ marginBottom: 64 }}>
                <ScreenshotsSection
                  screenshots={report.screenshots.filter((s) => !s.sectionId)}
                  title={TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title}
                  onDelete={async () => {}}
                />
              </div>
            );
          }
          return (
            <div key={section.id} id={`section-${section.id}`} data-section-type={section.sectionType} style={{ marginBottom: 64 }}>
              <TextSection
                sectionId={section.id}
                reportId={report.id}
                sectionType={section.sectionType}
                title={section.title}
                contentText={section.contentText ?? null}
              />
            </div>
          );
        }

        const unconfiguredNotice = (msg: string) => (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "20px 24px",
              fontSize: 13,
              color: "#94a3b8",
              fontStyle: "italic",
            }}
          >
            {msg}
          </div>
        );

        return (
          <div key={section.id} id={`section-${section.id}`} data-section-type={section.sectionType} style={{ marginBottom: 64 }}>
            {section.sectionType === "overview" && (
              <OverviewSection
                client={report.client}
                startDate={startDate}
                endDate={endDate}
                compareStartDate={compareStartDate ?? undefined}
                compareEndDate={compareEndDate ?? undefined}
                reportMode
                visibleBlocks={visibleBlocks}
                afterHeader={afterHeader}
              />
            )}
            {section.sectionType === "seo" &&
              (report.client.semrushDomain ? (
                <SemrushSection
                  domain={report.client.semrushDomain}
                  projectId={report.client.semrushProjectId}
                  campaignIds={semrushCampaignIds}
                  startDate={startDate}
                  endDate={endDate}
                  visibleBlocks={visibleBlocks}
                  hideAlerts
                  hideAi
                  afterHeader={afterHeader}
                />
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No SEMrush domain connected.")}
                </>
              ))}
            {section.sectionType === "web" &&
              (report.client.ga4PropertyId ? (
                <GA4Section
                  propertyId={report.client.ga4PropertyId}
                  clientId={report.client.id}
                  clientName={report.client.name}
                  startDate={startDate}
                  endDate={endDate}
                  compareStartDate={compareStartDate ?? undefined}
                  compareEndDate={compareEndDate ?? undefined}
                  visibleBlocks={visibleBlocks}
                  hideAlerts
                  hideAi
                  afterHeader={afterHeader}
                />
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No GA4 property connected.")}
                </>
              ))}
            {section.sectionType === "paid_social" &&
              (report.client.metaAccountId ? (
                <MetaSection
                  clientId={report.client.id}
                  clientName={report.client.name}
                  startDate={startDate}
                  endDate={endDate}
                  compareStartDate={compareStartDate ?? undefined}
                  compareEndDate={compareEndDate ?? undefined}
                  visibleBlocks={visibleBlocks}
                  hideAlerts
                  hideAi
                  reportMode
                  afterHeader={afterHeader}
                />
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No Meta ad account connected.")}
                </>
              ))}
            {section.sectionType === "googleads" &&
              (report.client.googleAdsCustomerId ? (
                <GoogleAdsSection
                  customerId={report.client.googleAdsCustomerId}
                  clientId={report.client.id}
                  clientName={report.client.name}
                  startDate={startDate}
                  endDate={endDate}
                  compareStartDate={compareStartDate ?? undefined}
                  compareEndDate={compareEndDate ?? undefined}
                  visibleBlocks={visibleBlocks}
                  hideAlerts
                  hideAi
                  reportMode
                  afterHeader={afterHeader}
                />
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No Google Ads account connected.")}
                </>
              ))}
            {section.sectionType === "searchconsole" &&
              (report.client.searchConsoleSiteUrl ? (
                <SearchConsoleSection
                  siteUrl={report.client.searchConsoleSiteUrl}
                  startDate={startDate}
                  endDate={endDate}
                  compareStartDate={compareStartDate ?? undefined}
                  compareEndDate={compareEndDate ?? undefined}
                  visibleBlocks={visibleBlocks}
                  hideAlerts
                  hideAi
                  afterHeader={afterHeader}
                />
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No Search Console property connected.")}
                </>
              ))}
            {section.sectionType === "ecommerce" &&
              (report.client.woocommerceUrl || report.client.shopifyStoreDomain ? (
                <>
                  {afterHeader}
                  <EcommerceSection
                    clientId={report.client.id}
                    platform={report.client.shopifyStoreDomain ? "shopify" : "woocommerce"}
                    startDate={startDate}
                    endDate={endDate}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No WooCommerce or Shopify store connected.")}
                </>
              ))}
            {section.sectionType === "tiktok" &&
              (report.client.tiktokAdvertiserId ? (
                <>
                  {afterHeader}
                  <TikTokSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    startDate={startDate}
                    endDate={endDate}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No TikTok advertiser account connected.")}
                </>
              ))}
            {section.sectionType === "microsoft_ads" &&
              (report.client.microsoftAdsAccountId ? (
                <>
                  {afterHeader}
                  <MicrosoftAdsSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    startDate={startDate}
                    endDate={endDate}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No Microsoft Ads account connected.")}
                </>
              ))}
            {section.sectionType === "linkedin" &&
              (report.client.linkedinAccountId ? (
                <>
                  {afterHeader}
                  <LinkedInSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    accountId={report.client.linkedinAccountId}
                    accessToken={report.client.linkedinAccessToken}
                    startDate={startDate}
                    endDate={endDate}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No LinkedIn ad account connected.")}
                </>
              ))}
            {section.sectionType === "klaviyo" &&
              (report.client.klaviyoApiKey ? (
                <>
                  {afterHeader}
                  <KlaviyoSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    startDate={startDate}
                    endDate={endDate}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No Klaviyo account connected.")}
                </>
              ))}
            {section.sectionType === "goals" && (
              <>
                {afterHeader}
                <GoalsSection clientId={report.client.id} visibleBlocks={visibleBlocks} />
              </>
            )}
            {section.sectionType === "youtube" &&
              (report.client.youtubeChannelId ? (
                <>
                  {afterHeader}
                  <YouTubeSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No YouTube channel connected.")}
                </>
              ))}
            {section.sectionType === "hubspot" &&
              (report.client.hubspotPortalId ? (
                <>
                  {afterHeader}
                  <HubSpotSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No HubSpot portal connected.")}
                </>
              ))}
            {section.sectionType === "callrail" &&
              (report.client.callrailAccountId ? (
                <>
                  {afterHeader}
                  <CallRailSection
                    clientId={report.client.id}
                    clientName={report.client.name}
                    visibleBlocks={visibleBlocks}
                  />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No CallRail account connected.")}
                </>
              ))}
            {section.sectionType === "core_web_vitals" &&
              (report.client.website ? (
                <>
                  {afterHeader}
                  <CoreWebVitalsSection url={report.client.website} visibleBlocks={visibleBlocks} />
                </>
              ) : (
                <>
                  {afterHeader}
                  {unconfiguredNotice("No website URL set for this client.")}
                </>
              ))}
            {section.sectionType === "competitor_intelligence" && (
              <>
                {afterHeader}
                <CompetitorIntelligenceSection
                  clientId={report.client.id}
                  semrushDomain={report.client.semrushDomain}
                  visibleBlocks={visibleBlocks}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Report-level screenshots */}
      {report.screenshots.filter((s) => !s.sectionId).length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94a3b8",
              marginBottom: 16,
            }}
          >
            Additional Screenshots
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {report.screenshots
              .filter((s) => !s.sectionId)
              .map((screenshot) => (
                <div
                  key={screenshot.id}
                  style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot.url}
                    alt={screenshot.caption ?? screenshot.filename}
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                  />
                  {screenshot.caption && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        padding: "7px 12px",
                        background: "var(--bg)",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      {screenshot.caption}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
