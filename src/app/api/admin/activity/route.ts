import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const action = searchParams.get("action") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const search = searchParams.get("search") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { userEmail: { contains: search } },
      { userName: { contains: search } },
      { clientName: { contains: search } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.userActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.userActivityLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize: PAGE_SIZE });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const olderThanDays = parseInt(searchParams.get("olderThanDays") ?? "90", 10);

  if (isNaN(olderThanDays) || olderThanDays < 1) {
    return NextResponse.json({ error: "Invalid olderThanDays" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const result = await db.userActivityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  return NextResponse.json({ deleted: result.count });
}
