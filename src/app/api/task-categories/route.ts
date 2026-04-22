import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Read-only listing of task boards (categories) for any authenticated user.
 * Used by the cross-client Task Overview tool for filter dropdowns / board tabs.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.taskCategory.findMany({
    where: { isArchived: false },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, color: true, icon: true, sortOrder: true },
  });
  return NextResponse.json(categories);
}
