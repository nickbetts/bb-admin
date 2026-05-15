import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normaliseUrlList,
  parseRefineState,
  stringifyRefineState,
  toRefinementMode,
  type RefineJobPayload,
} from "@/lib/lp-refine-jobs";

export const dynamic = "force-dynamic";

const SINGLE_PASS_URL_LIMIT = 12;
const DOUBLE_PASS_URL_LIMIT = 20;

// POST /api/tools/landing-pages/[id]/refine/jobs
// Creates a background refinement job. The client polls /run for batched steps.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, currentHtml: true },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as RefineJobPayload;
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const currentHtmlFromClient =
      typeof body.currentHtml === "string" && body.currentHtml.trim()
        ? body.currentHtml
        : undefined;

    const refinementMode = toRefinementMode(body.refinementMode);
    const crawlUrlLimit =
      refinementMode === "double-pass" ? DOUBLE_PASS_URL_LIMIT : SINGLE_PASS_URL_LIMIT;

    const payload: RefineJobPayload = {
      prompt,
      currentHtml: currentHtmlFromClient,
      refinementMode,
      conversationHistory: Array.isArray(body.conversationHistory)
        ? body.conversationHistory.slice(-12)
        : undefined,
      referenceHtml: typeof body.referenceHtml === "string" ? body.referenceHtml : undefined,
      imageUrls: normaliseUrlList(body.imageUrls, 120),
      crawlUrls: normaliseUrlList(body.crawlUrls, crawlUrlLimit),
    };

    const initialState = parseRefineState(null);
    initialState.phase = "prepare";
    initialState.currentHtml = currentHtmlFromClient ?? landingPage.currentHtml;

    const job = await prisma.landingPageRefineJob.create({
      data: {
        landingPageId: id,
        userId: session.user.id,
        status: "pending",
        refinementMode,
        prompt,
        payloadJson: JSON.stringify(payload),
        stateJson: stringifyRefineState(initialState),
        progressMessage:
          refinementMode === "double-pass"
            ? "Queued, double-pass refinement will run in batches."
            : "Queued, refinement will run in batches.",
        progressPercent: 0,
      },
      select: {
        id: true,
        status: true,
        refinementMode: true,
        progressMessage: true,
        progressPercent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP refine job create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
