import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireTaskCategoriesPermission() {
  const session = await getSession();
  if (!session) return null;
  if (!hasPermission(session, "admin.task_categories")) return null;
  return session;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const session = await requireTaskCategoriesPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const categories = await prisma.taskCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await requireTaskCategoriesPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await request.json()) as {
      name: string;
      slug?: string;
      color?: string;
      icon?: string;
      sortOrder?: number;
    };

    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const slug = body.slug?.trim() || slugify(body.name);
    const last = await prisma.taskCategory.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const created = await prisma.taskCategory.create({
      data: {
        name: body.name,
        slug,
        color: body.color ?? null,
        icon: body.icon ?? null,
        sortOrder: body.sortOrder ?? (last?.sortOrder ?? 0) + 10,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create task category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
