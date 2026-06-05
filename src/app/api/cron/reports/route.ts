import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ReportSchedule {
  frequency: "monthly" | "weekly";
  dayOfMonth?: number;
  dayOfWeek?: number;
  autoApprove: boolean;
  templateId?: string;
}

// POST /api/cron/reports — automated report generation
// Triggered monthly by Vercel cron (1st of each month at 6am)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all clients with report schedules
    const clients = await prisma.client.findMany({
      where: { reportSchedule: { not: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        reportSchedule: true,
        notifyEmail: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        searchConsoleSiteUrl: true,
        website: true,
        tiktokAdvertiserId: true,
        tiktokAccessToken: true,
        microsoftAdsAccountId: true,
        linkedinAccountId: true,
        linkedinAccessToken: true,
        klaviyoApiKey: true,
        youtubeChannelId: true,
        hubspotAccessToken: true,
        callrailAccountId: true,
        callrailApiKey: true,
        cwvUrl: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
      },
    });

    const today = new Date();
    const currentDay = today.getDate();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday

    const results: {
      clientId: string;
      clientName: string;
      reportId?: string;
      error?: string;
      skipped?: boolean;
    }[] = [];

    for (const client of clients) {
      let schedule: ReportSchedule;
      try {
        schedule = JSON.parse(client.reportSchedule!);
      } catch {
        results.push({
          clientId: client.id,
          clientName: client.name,
          error: "Invalid schedule JSON",
        });
        continue;
      }

      // Check if report should be generated today
      if (schedule.frequency === "monthly") {
        const targetDay = schedule.dayOfMonth ?? 1;
        if (currentDay !== targetDay) {
          results.push({ clientId: client.id, clientName: client.name, skipped: true });
          continue;
        }
      } else if (schedule.frequency === "weekly") {
        const targetDay = schedule.dayOfWeek ?? 1; // Monday default
        if (currentDayOfWeek !== targetDay) {
          results.push({ clientId: client.id, clientName: client.name, skipped: true });
          continue;
        }
      }

      try {
        // Calculate date range (previous month for monthly, previous week for weekly)
        let periodStart: Date;
        let periodEnd: Date;
        let periodLabel: string;

        if (schedule.frequency === "monthly") {
          periodEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of prev month
          periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1); // First day of prev month
          periodLabel = periodStart.toLocaleString("en-GB", { month: "long", year: "numeric" });
        } else {
          periodEnd = new Date(today);
          periodEnd.setDate(periodEnd.getDate() - 1); // Yesterday
          periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 6); // 7 days ago
          periodLabel = `Week of ${periodStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
        }

        const startDateStr = periodStart.toISOString().split("T")[0];
        const endDateStr = periodEnd.toISOString().split("T")[0];

        // Get template sections (if template specified)
        let sections: { sectionType: string; title: string; orderIndex: number }[] = [];

        if (schedule.templateId) {
          const template = await prisma.reportTemplate.findUnique({
            where: { id: schedule.templateId },
          });
          if (template) {
            try {
              sections = JSON.parse(template.sections);
            } catch {
              /* use defaults */
            }
          }
        }

        // Default sections if no template
        if (sections.length === 0) {
          const availableSections: { type: string; title: string; check: boolean }[] = [
            { type: "overview", title: "Cross-Channel Overview", check: true },
            { type: "seo", title: "SEO / Organic Search", check: !!client.website },
            { type: "ga4", title: "Web Analytics (GA4)", check: !!client.ga4PropertyId },
            {
              type: "searchconsole",
              title: "Search Console",
              check: !!client.searchConsoleSiteUrl,
            },
            { type: "meta", title: "Paid Social (Meta)", check: !!client.metaAccountId },
            {
              type: "googleads",
              title: "Paid Search (Google Ads)",
              check: !!client.googleAdsCustomerId,
            },
            {
              type: "tiktok",
              title: "TikTok Ads",
              check: !!(client.tiktokAdvertiserId && client.tiktokAccessToken),
            },
            {
              type: "microsoft_ads",
              title: "Microsoft Ads",
              check: !!client.microsoftAdsAccountId,
            },
            {
              type: "linkedin",
              title: "LinkedIn Ads",
              check: !!(client.linkedinAccountId && client.linkedinAccessToken),
            },
            { type: "klaviyo", title: "Email Marketing (Klaviyo)", check: !!client.klaviyoApiKey },
            { type: "youtube", title: "YouTube", check: !!client.youtubeChannelId },
            { type: "hubspot", title: "HubSpot CRM", check: !!client.hubspotAccessToken },
            {
              type: "callrail",
              title: "Call Tracking (CallRail)",
              check: !!(client.callrailAccountId && client.callrailApiKey),
            },
            { type: "core_web_vitals", title: "Core Web Vitals", check: !!client.cwvUrl },
            {
              type: "ecommerce",
              title: "E-commerce",
              check: !!(client.woocommerceUrl || client.shopifyStoreDomain),
            },
          ];

          sections = availableSections
            .filter((s) => s.check)
            .map((s, i) => ({ sectionType: s.type, title: s.title, orderIndex: i }));
        }

        // Deduplicate data sections by sectionType, keeping first occurrence.
        // Text sections (text_*) are exempt as multiple content blocks are valid.
        const seenSectionTypes = new Set<string>();
        sections = sections.filter((s) => {
          if (s.sectionType.startsWith("text_")) return true;
          if (seenSectionTypes.has(s.sectionType)) return false;
          seenSectionTypes.add(s.sectionType);
          return true;
        });

        // Create the report
        const report = await prisma.report.create({
          data: {
            clientId: client.id,
            title: `${client.name} — ${periodLabel}`,
            period: schedule.frequency === "monthly" ? "monthly" : "7d",
            status: schedule.autoApprove ? "published" : "draft",
            customStartDate: startDateStr,
            customEndDate: endDateStr,
            sections: {
              create: sections.map((s) => ({
                sectionType: s.sectionType,
                title: s.title,
                orderIndex: s.orderIndex,
                enabled: true,
              })),
            },
          },
        });

        // Generate AI commentary for each section
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

        const reportSections = await prisma.reportSection.findMany({
          where: { reportId: report.id },
        });

        for (const section of reportSections) {
          try {
            const commentaryRes = await fetch(`${baseUrl}/api/ai/report-commentary`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: client.id,
                clientName: client.name,
                sectionType: section.sectionType,
                startDate: startDateStr,
                endDate: endDateStr,
              }),
            });

            if (commentaryRes.ok) {
              const { commentary } = await commentaryRes.json();
              if (commentary) {
                await prisma.reportSection.update({
                  where: { id: section.id },
                  data: { commentary },
                });
              }
            }
          } catch (err) {
            console.error(
              `[cron/reports] Failed to generate commentary for ${section.sectionType}:`,
              err,
            );
          }
        }

        // Notify admins that report is ready
        try {
          const { notifyAdmins } = await import("@/lib/notifications");
          await notifyAdmins({
            clientId: client.id,
            type: schedule.autoApprove ? "report_sent" : "report_ready",
            severity: "low",
            title: `Report generated: ${client.name}`,
            body: schedule.autoApprove
              ? `Monthly report for ${client.name} (${periodLabel}) has been auto-published.`
              : `Monthly report for ${client.name} (${periodLabel}) is ready for review.`,
            metadata: { reportId: report.id, period: periodLabel },
          });
        } catch (err) {
          console.error("[cron/reports] Failed to send notification:", err);
        }

        results.push({ clientId: client.id, clientName: client.name, reportId: report.id });
      } catch (err) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const generated = results.filter((r) => r.reportId).length;
    const skipped = results.filter((r) => r.skipped).length;
    const errors = results.filter((r) => r.error).length;

    console.log(`[cron/reports] Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      errors,
      results: results.filter((r) => !r.skipped),
    });
  } catch (error) {
    console.error("[cron/reports] Fatal error:", error);
    return NextResponse.json({ error: "Report automation failed" }, { status: 500 });
  }
}

// Vercel Cron Jobs invoke endpoints with GET requests; alias GET → POST so
// scheduled runs work in addition to admin-triggered POST calls.
export { POST as GET };
