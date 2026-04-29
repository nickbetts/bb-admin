import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditAndRefineLandingPage, injectLucide } from "@/lib/lp-generator";
import type { BrandContext } from "@/lib/brand-extractor";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
// Audit: 3 parallel classifiers (~15 s) + 1 refinement (~90 s) = ~105 s
export const maxDuration = 300;

/**
 * POST /api/tools/landing-pages/[id]/audit
 *
 * Second Vercel job in the two-stage LP generation pipeline:
 *   Job 1 (/api/tools/landing-pages POST): plan + sections + assembly + save
 *   Job 2 (this route): CRO/Design/Copy audits + combined refinement + save
 *
 * Streams NDJSON progress events so the client can show live status, then
 * emits { type: "done" } when the updated HTML has been saved.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      currentHtml: true,
      briefJson: true,
      brandContextJson: true,
      title: true,
      clientId: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { versionNumber: true } },
      client: { select: { name: true } },
    },
  });

  if (!landingPage) return Response.json({ error: "Not found" }, { status: 404 });
  if (landingPage.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let briefData: { brief?: string; campaignType?: string; targetAudience?: string; url?: string } = {};
  try { briefData = JSON.parse(landingPage.briefJson); } catch { /* use defaults */ }

  let brandContext: BrandContext;
  try {
    brandContext = JSON.parse(landingPage.brandContextJson);
  } catch {
    brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const refinedHtml = await auditAndRefineLandingPage({
          html: landingPage.currentHtml,
          brief: briefData.brief ?? "",
          campaignType: briefData.campaignType ?? "general",
          brandContext,
          targetAudience: briefData.targetAudience,
          onProgress: async (msg) => { send({ type: "progress", message: msg }); },
        });

        const html = injectLucide(refinedHtml);

        const latestVersionNumber = landingPage.versions[0]?.versionNumber ?? 1;
        await prisma.$transaction([
          prisma.landingPageVersion.create({
            data: {
              landingPageId: id,
              versionNumber: latestVersionNumber + 1,
              html,
              prompt: "Automatic post-generation audit (CRO, Design, Copy)",
            },
          }),
          prisma.landingPage.update({
            where: { id },
            data: { currentHtml: html },
          }),
        ]);

        logActivity({
          userId: session.user.id,
          userEmail: session.user.email,
          action: "landing_page_refined",
          resourceType: "LandingPage",
          resourceId: id,
          clientId: landingPage.clientId ?? undefined,
          clientName: landingPage.client?.name ?? undefined,
          description: `Post-generation audit applied to "${landingPage.title}"`,
        });

        send({ type: "done" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[audit route] error:", error);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
