import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUsersPermission() {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.permissions.includes("users")) return null;
  return session;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  mustChangePassword: true,
  createdAt: true,
  roleId: true,
  userRole: { select: { id: true, name: true } },
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUsersPermission();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    roleId?: string;
    password?: string;
  };

  const data: Record<string, string | boolean | null> = {};
  if (body.name) data.name = body.name.trim();
  if (body.roleId !== undefined) {
    if (body.roleId === null) {
      data.roleId = null;
    } else {
      const roleRecord = await prisma.role.findUnique({ where: { id: body.roleId } });
      if (!roleRecord) return NextResponse.json({ error: "Role not found" }, { status: 400 });
      data.roleId = body.roleId;
    }
  }
  if (body.password) {
    data.password = await bcrypt.hash(body.password, 12);
    data.mustChangePassword = true;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUsersPermission();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
