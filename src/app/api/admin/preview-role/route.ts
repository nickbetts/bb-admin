import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/preview-role — Set a preview role cookie
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { roleId?: string };
  const { roleId } = body;

  const response = NextResponse.json({ ok: true });

  if (!roleId || roleId === "none") {
    response.cookies.delete("preview_role_id");
    return response;
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  response.cookies.set("preview_role_id", roleId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}

// DELETE /api/admin/preview-role — Clear the preview role cookie
export async function DELETE() {
  const session = await getSession();
  if (!session || !session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("preview_role_id");
  return response;
}
