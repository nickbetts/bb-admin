import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── Types mirroring the slice of GrandPlanData we care about ──────────────

interface KeywordRef {
  keyword?: string;
  volume?: number;
}

interface ContentEntry {
  url?: string;
  title?: string;
  notes?: string;
  brief?: string;
  keywords?: KeywordRef[];
  intent?: string;
  tier?: string;
}

interface ContentCalendarPost {
  title?: string;
  topic?: string;
  intent?: string;
  targetKeyword?: string;
  keyword?: string;
}

interface ContentCalendarMonth {
  month?: string;
  posts?: ContentCalendarPost[];
}

interface QuickWin {
  title?: string;
  description?: string;
  impact?: string;
}

interface PlanSections {
  contentStrategy?: {
    pageOptimisations?: ContentEntry[];
    landingPages?: ContentEntry[];
    blogPosts?: ContentEntry[];
  };
  contentCalendar?: ContentCalendarMonth[];
  quickWins?: QuickWin[];
}

interface PlanData {
  sections?: PlanSections;
}

interface CreatePayload {
  /** Which categories to export. If omitted, exports all available categories. */
  include?: Array<
    | "pageOptimisations"
    | "landingPages"
    | "blogPosts"
    | "contentCalendar"
    | "quickWins"
  >;
  /** Default priority for created actions. Default: "medium". */
  priority?: "low" | "medium" | "high" | "urgent";
  /** Optional assignee user id. */
  assignedTo?: string;
  /** Optional ISO date string applied as the due date when no smarter mapping fires. */
  dueDate?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildKeywordSummary(keywords?: KeywordRef[]): string {
  if (!keywords || keywords.length === 0) return "";
  const top = keywords.slice(0, 5);
  const list = top
    .map((k) => (k.volume ? `${k.keyword} (${k.volume.toLocaleString()})` : k.keyword))
    .filter(Boolean)
    .join(", ");
  const more = keywords.length > top.length ? ` +${keywords.length - top.length} more` : "";
  return list ? `Target keywords: ${list}${more}` : "";
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * POST /api/tools/grand-plan/[id]/export-actions
 *
 * Creates ActionItem records for each content recommendation surfaced in the
 * plan's `planDataJson.sections`. Mirrors the Content Strategy export-actions
 * route — Grand Plan is gradually replacing it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as CreatePayload;

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        clientId: true,
        title: true,
        planDataJson: true,
      },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!plan.clientId) {
      return NextResponse.json(
        { error: "Plan must be linked to a client before exporting actions." },
        { status: 400 },
      );
    }

    let data: PlanData;
    try {
      data = plan.planDataJson ? (JSON.parse(plan.planDataJson) as PlanData) : {};
    } catch {
      return NextResponse.json({ error: "Plan data is corrupt" }, { status: 422 });
    }

    const sections = data.sections ?? {};
    const include = body.include && body.include.length > 0
      ? new Set(body.include)
      : new Set<string>([
          "pageOptimisations",
          "landingPages",
          "blogPosts",
          "contentCalendar",
          "quickWins",
        ]);

    const priority = body.priority ?? "medium";
    const assignedTo = body.assignedTo ?? null;
    const fallbackDue = body.dueDate ?? null;
    const sourceRef = `grand-plan:${plan.id}`;
    const today = new Date();

    const toCreate: Array<{ title: string; description: string | null; dueDate: string | null }> = [];

    // ── Page optimisations: month 1
    if (include.has("pageOptimisations") && sections.contentStrategy?.pageOptimisations) {
      for (const item of sections.contentStrategy.pageOptimisations) {
        const label = item.url ?? item.title;
        if (!label) continue;
        const desc = [item.notes ?? item.brief, buildKeywordSummary(item.keywords)]
          .filter(Boolean)
          .join("\n\n");
        toCreate.push({
          title: `Optimise page: ${label}`,
          description: desc || null,
          dueDate: addDays(today, 30),
        });
      }
    }

    // ── Landing pages: months 2–3
    if (include.has("landingPages") && sections.contentStrategy?.landingPages) {
      for (const item of sections.contentStrategy.landingPages) {
        const label = item.title ?? item.url;
        if (!label) continue;
        const desc = [item.notes ?? item.brief, buildKeywordSummary(item.keywords)]
          .filter(Boolean)
          .join("\n\n");
        toCreate.push({
          title: `Build landing page: ${label}`,
          description: desc || null,
          dueDate: addDays(today, 60),
        });
      }
    }

    // ── Blog posts: distributed across the year (one batch per month)
    if (include.has("blogPosts") && sections.contentStrategy?.blogPosts) {
      const posts = sections.contentStrategy.blogPosts.filter((p) => p.title || p.url);
      // Spread across 12 months, monthly cadence
      posts.forEach((item, idx) => {
        const label = item.title ?? item.url ?? "Untitled";
        const desc = [item.notes ?? item.brief, buildKeywordSummary(item.keywords)]
          .filter(Boolean)
          .join("\n\n");
        toCreate.push({
          title: `Write blog post: ${label}`,
          description: desc || null,
          dueDate: addDays(today, 30 + (idx % 12) * 30),
        });
      });
    }

    // ── Content calendar: each scheduled post becomes a task in its month
    if (include.has("contentCalendar") && sections.contentCalendar) {
      sections.contentCalendar.forEach((month, monthIdx) => {
        if (!month.posts) return;
        for (const post of month.posts) {
          const label = post.title ?? post.topic ?? post.targetKeyword ?? post.keyword;
          if (!label) continue;
          const intent = post.intent ? ` (${post.intent})` : "";
          toCreate.push({
            title: `Publish: ${label}${intent}`,
            description: month.month ? `Scheduled for ${month.month}` : null,
            dueDate: addDays(today, 30 + monthIdx * 30),
          });
        }
      });
    }

    // ── Quick wins: 14-day window
    if (include.has("quickWins") && sections.quickWins) {
      for (const win of sections.quickWins) {
        const label = win.title;
        if (!label) continue;
        toCreate.push({
          title: `Quick win: ${label}`,
          description: win.description ?? null,
          dueDate: addDays(today, 14),
        });
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({
        created: 0,
        message:
          "No exportable items found in this plan. Generate the plan first and ensure the chosen sections contain content.",
      });
    }

    const result = await prisma.actionItem.createMany({
      data: toCreate.map((a) => ({
        clientId: plan.clientId!,
        title: a.title,
        description: a.description,
        status: "to_do",
        priority,
        assignedTo,
        dueDate: a.dueDate ?? fallbackDue,
        sourceType: "grand_plan",
        sourceRef,
      })),
    });

    return NextResponse.json({
      created: result.count,
      categories: Array.from(include),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Export grand plan actions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
