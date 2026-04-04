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
  const level = searchParams.get("level") ?? "all"; // "all" | "error" | "warn"
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const since = searchParams.get("since"); // ISO date string

  const where = {
    ...(level !== "all" ? { level } : {}),
    ...(search ? { message: { contains: search } } : {}),
    ...(since ? { createdAt: { gte: new Date(since) } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.serverLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.serverLog.count({ where }),
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
  const olderThanDays = parseInt(searchParams.get("days") ?? "7", 10);
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const { count } = await prisma.serverLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: count });
}
