import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportPrintView } from "@/components/reports/ReportPrintView";

export const dynamic = "force-dynamic";

/**
 * Public share-link viewer for a report. Renders the same ReportPrintView used
 * by the internal preview, so share recipients see all charts, cards and
 * commentary — not just the commentary boxes.
 *
 * Authentication for the per-channel API fetches happens via the share-token
 * cookie set by src/middleware.ts. Each whitelisted API route validates the
 * cookie via getShareTokenAuth and gates data access via
 * assertShareClientAccess / assertShareResourceAccess.
 */
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const report = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
          website: true,
          logoUrl: true,
          semrushDomain: true,
          semrushProjectId: true,
          semrushCampaignIds: true,
          ga4PropertyId: true,
          metaAccountId: true,
          googleAdsCustomerId: true,
          searchConsoleSiteUrl: true,
          woocommerceUrl: true,
          shopifyStoreDomain: true,
        },
      },
      sections: { orderBy: { orderIndex: "asc" } },
      screenshots: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!report) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/primary-logo.svg" alt="i3media" style={{ height: 28 }} />
        <p style={{ fontSize: 12, color: "#94a3b8" }}>Confidential · Shared Report</p>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
        <ReportPrintView report={report} />
      </div>
    </div>
  );
}
