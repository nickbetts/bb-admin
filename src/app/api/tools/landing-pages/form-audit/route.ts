import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLandingPageForm } from "@/lib/landing-page-form-audit";

export const dynamic = "force-dynamic";

type AuditStatus = "pass" | "warn" | "fail";

interface AuditPageResult {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  audit: ReturnType<typeof auditLandingPageForm>;
}

interface ClientAuditGroup {
  clientId: string | null;
  clientName: string;
  summary: Record<AuditStatus, number>;
  pages: AuditPageResult[];
}

function createSummary(): Record<AuditStatus, number> {
  return { pass: 0, warn: 0, fail: 0 };
}

// GET /api/tools/landing-pages/form-audit
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;

    const landingPages = await prisma.landingPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        currentHtml: true,
        formConfig: true,
        client: { select: { id: true, name: true } },
      },
    });

    const groups = new Map<string, ClientAuditGroup>();
    const summary = createSummary();

    for (const page of landingPages) {
      const audit = auditLandingPageForm({
        currentHtml: page.currentHtml,
        formConfigRaw: page.formConfig,
      });

      summary[audit.status] += 1;

      const clientKey = page.client?.id ?? "__unassigned__";
      const existing = groups.get(clientKey);
      if (!existing) {
        groups.set(clientKey, {
          clientId: page.client?.id ?? null,
          clientName: page.client?.name ?? "Unassigned",
          summary: createSummary(),
          pages: [],
        });
      }

      const target = groups.get(clientKey);
      if (!target) continue;

      target.summary[audit.status] += 1;
      target.pages.push({
        id: page.id,
        title: page.title,
        status: page.status,
        updatedAt: page.updatedAt.toISOString(),
        audit,
      });
    }

    const clients = Array.from(groups.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName),
    );

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      summary: {
        total: landingPages.length,
        ...summary,
      },
      clients,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Landing page form audit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
