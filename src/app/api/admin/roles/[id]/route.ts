import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUsersPermission() {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.permissions.includes("users")) return null;
  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUsersPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as { name?: string; permissions?: string[] };

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const data: Record<string, string> = {};
  if (body.name?.trim()) {
    const nameConflict = await prisma.role.findFirst({ where: { name: body.name.trim(), NOT: { id } } });
    if (nameConflict) return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
    data.name = body.name.trim();
  }
  if (Array.isArray(body.permissions)) {
    data.permissions = JSON.stringify(body.permissions);
  }

  const updated = await prisma.role.update({ where: { id }, data });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    permissions: JSON.parse(updated.permissions) as string[],
    isSystem: updated.isSystem,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUsersPermission();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (existing.isSystem) {
    return NextResponse.json({ error: "Built-in roles cannot be deleted" }, { status: 400 });
  }

  await prisma.role.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
