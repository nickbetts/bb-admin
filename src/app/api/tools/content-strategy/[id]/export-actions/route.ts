import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface KeywordRef {
  keyword?: string;
  volume?: number;
}

interface SpreadsheetData {
  pageOptimisations?: Array<{ url?: string; keywords?: KeywordRef[]; notes?: string }>;
  landingPages?: Array<{ title?: string; keywords?: KeywordRef[]; notes?: string }>;
  categoryPages?: Array<{ title?: string; keywords?: KeywordRef[]; notes?: string }>;
  blogPosts?: Array<{ title?: string; keywords?: KeywordRef[]; notes?: string }>;
  linkTargets?: Array<{ url?: string; anchorKeyword?: string; anchorType?: string }>;
}

interface CreatePayload {
  /** Which categories to export. If omitted, exports all available categories. */
  include?: Array<"pageOptimisations" | "landingPages" | "categoryPages" | "blogPosts" | "linkTargets">;
  /** Default priority for created actions. Default: "medium". */
  priority?: "low" | "medium" | "high" | "urgent";
  /** Optional assignee user id. */
  assignedTo?: string;
  /** Optional ISO date string applied as the due date. */
  dueDate?: string;
}

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

/**
 * POST /api/tools/content-strategy/[id]/export-actions
 * Creates ActionItem records for each content recommendation in the strategy.
 * Returns the count created and the categories included.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as CreatePayload;

    const strategy = await prisma.contentStrategy.findUnique({
      where: { id },
      select: { id: true, clientId: true, title: true, spreadsheetData: true },
    });
    if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    if (!strategy.clientId) return NextResponse.json({ error: "Strategy is not linked to a client" }, { status: 400 });

    let data: SpreadsheetData;
    try {
      data = JSON.parse(strategy.spreadsheetData) as SpreadsheetData;
    } catch {
      return NextResponse.json({ error: "Strategy data is corrupt" }, { status: 422 });
    }

    const include = body.include && body.include.length > 0
      ? new Set(body.include)
      : new Set<string>(["pageOptimisations", "landingPages", "categoryPages", "blogPosts", "linkTargets"]);

    const priority = body.priority ?? "medium";
    const dueDate = body.dueDate ?? null;
    const assignedTo = body.assignedTo ?? null;
    const sourceRef = `content-strategy:${strategy.id}`;

    const toCreate: Array<{ title: string; description: string | null }> = [];

    if (include.has("pageOptimisations") && data.pageOptimisations) {
      for (const item of data.pageOptimisations) {
        if (!item.url) continue;
        const desc = [item.notes, buildKeywordSummary(item.keywords)].filter(Boolean).join("\n\n");
        toCreate.push({
          title: `Optimise page: ${item.url}`,
          description: desc || null,
        });
      }
    }
    if (include.has("landingPages") && data.landingPages) {
      for (const item of data.landingPages) {
        if (!item.title) continue;
        const desc = [item.notes, buildKeywordSummary(item.keywords)].filter(Boolean).join("\n\n");
        toCreate.push({
          title: `Build landing page: ${item.title}`,
          description: desc || null,
        });
      }
    }
    if (include.has("categoryPages") && data.categoryPages) {
      for (const item of data.categoryPages) {
        if (!item.title) continue;
        const desc = [item.notes, buildKeywordSummary(item.keywords)].filter(Boolean).join("\n\n");
        toCreate.push({
          title: `Build category page: ${item.title}`,
          description: desc || null,
        });
      }
    }
    if (include.has("blogPosts") && data.blogPosts) {
      for (const item of data.blogPosts) {
        if (!item.title) continue;
        const desc = [item.notes, buildKeywordSummary(item.keywords)].filter(Boolean).join("\n\n");
        toCreate.push({
          title: `Write blog post: ${item.title}`,
          description: desc || null,
        });
      }
    }
    if (include.has("linkTargets") && data.linkTargets) {
      for (const item of data.linkTargets) {
        if (!item.url) continue;
        const anchor = item.anchorKeyword
          ? `Anchor: "${item.anchorKeyword}"${item.anchorType ? ` (${item.anchorType})` : ""}`
          : "";
        toCreate.push({
          title: `Build backlink to: ${item.url}`,
          description: anchor || null,
        });
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, message: "No exportable items found in this strategy." });
    }

    // Use createMany for performance — SQLite + libSQL both support it via Prisma.
    const result = await prisma.actionItem.createMany({
      data: toCreate.map((a) => ({
        clientId: strategy.clientId!,
        title: a.title,
        description: a.description,
        status: "open",
        priority,
        assignedTo,
        dueDate,
        sourceType: "content_strategy",
        sourceRef,
      })),
    });

    return NextResponse.json({
      created: result.count,
      categories: Array.from(include),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Export content strategy actions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
