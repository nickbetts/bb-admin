import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight user list for assignee pickers, mention menus, etc.
 * Returns only non-sensitive fields and is available to any authenticated agency user.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
