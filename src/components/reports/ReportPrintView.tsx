"use client";

import { useEffect } from "react";
import { parsePeriodToDateRange } from "@/lib/utils";
import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { EcommerceSection } from "@/components/dashboard/EcommerceSection";
import { TextSection } from "@/components/reports/TextSection";
import { ScreenshotsSection } from "@/components/reports/ScreenshotsSection";

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
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  woocommerceUrl?: string | null;
  shopifyStoreDomain?: string | null;
}

interface Report {
  id: string;
  title: string;
  period: string;
  customStartDate?: string | null;
  customEndDate?: string | null;
  compareStartDate?: string | null;
  compareEndDate?: string | null;
  client: Client;
  sections: Section[];
  screenshots: Screenshot[];
}

export function ReportPrintView({ report }: { report: Report }) {
  const derived = parsePeriodToDateRange(report.period);
  const startDate = report.customStartDate || derived.startDate;
  const endDate = report.customEndDate || derived.endDate;
  const compareStartDate = report.compareStartDate || null;
  const compareEndDate = report.compareEndDate || null;

  const enabledSections = report.sections.filter((s) => s.enabled !== false);

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
          background: "#eef2ff",
          border: "1px solid #c7d2fe",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#4f46e5",
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
        background: "#fff",
        color: "#1e293b",
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 40px",
      }}
    >
      {/* Cover card */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          marginBottom: 36,
          pageBreakInside: "avoid",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
            padding: "36px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
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
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
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
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ss.url}
                    alt={ss.caption ?? ss.filename}
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                  />
                  {ss.caption && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        padding: "7px 12px",
                        background: "#f8fafc",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      {ss.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null;

        const afterHeader = (
          <>
            {commentaryBlock(section)}
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
              style={{ marginBottom: 32, pageBreakInside: "avoid" }}
            >
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 24px",
                    borderBottom: "1px solid #f1f5f9",
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
                      background: "#fffbeb",
                      color: "#b45309",
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
              <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32 }}>
                <ScreenshotsSection
                  screenshots={report.screenshots.filter((s) => !s.sectionId)}
                  title={TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title}
                  onDelete={async () => {}}
                />
              </div>
            );
          }
          return (
            <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32 }}>
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
              border: "1px solid #e2e8f0",
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
          <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32 }}>
            {section.sectionType === "overview" && (
              <OverviewSection
                client={report.client}
                startDate={startDate}
                endDate={endDate}
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
                  style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}
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
                        background: "#f8fafc",
                        borderTop: "1px solid #f1f5f9",
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

      {/* Footer */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/primary-logo.svg" alt="i3media" style={{ height: 24, filter: "brightness(0)" }} />
        <p style={{ fontSize: 12, color: "#94a3b8" }}>
          {report.title} · {report.period} ·{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
