import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET — returns the global category list with each one's enabled state + sort order for this client.
 * Useful for both rendering the kanban (filter to enabled) and the settings panel (show all).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [allCategories, links] = await Promise.all([
      prisma.taskCategory.findMany({
        where: { isArchived: false },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.clientTaskCategory.findMany({ where: { clientId: id } }),
    ]);

    const linkMap = new Map(links.map((l) => [l.categoryId, l]));
    const merged = allCategories.map((c) => {
      const link = linkMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color,
        icon: c.icon,
        isEnabled: link?.isEnabled ?? false,
        sortOrder: link?.sortOrder ?? c.sortOrder,
      };
    });

    merged.sort((a, b) => a.sortOrder - b.sortOrder);
    return NextResponse.json(merged);
  } catch (error) {
    console.error("Get client task categories error:", error);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

/**
 * PUT — bulk-replace this client's category preferences.
 * Body: { categories: [{ categoryId, isEnabled, sortOrder }] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as {
      categories: { categoryId: string; isEnabled: boolean; sortOrder: number }[];
    };

    if (!Array.isArray(body.categories)) {
      return NextResponse.json({ error: "categories array required" }, { status: 400 });
    }

    await prisma.$transaction(
      body.categories.map((c) =>
        prisma.clientTaskCategory.upsert({
          where: { clientId_categoryId: { clientId: id, categoryId: c.categoryId } },
          update: { isEnabled: c.isEnabled, sortOrder: c.sortOrder },
          create: {
            clientId: id,
            categoryId: c.categoryId,
            isEnabled: c.isEnabled,
            sortOrder: c.sortOrder,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update client task categories error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
