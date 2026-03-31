import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUsersPermission() {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.permissions.includes("users")) return null;
  return session;
}

export async function GET() {
  const session = await requireUsersPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: JSON.parse(r.permissions) as string[],
      isSystem: r.isSystem,
      userCount: r._count.users,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await requireUsersPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { name?: string; permissions?: string[] };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { name: body.name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
  }

  const role = await prisma.role.create({
    data: {
      name: body.name.trim(),
      permissions: JSON.stringify(body.permissions),
      isSystem: false,
    },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(
    { id: role.id, name: role.name, permissions: body.permissions, isSystem: role.isSystem, userCount: 0 },
    { status: 201 }
  );
}
