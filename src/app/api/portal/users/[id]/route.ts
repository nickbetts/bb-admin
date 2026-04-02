import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      name?: string;
      email?: string;
      permissions?: string[];
      isActive?: boolean;
    };

    const existing = await prisma.clientPortalUser.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });

    const user = await prisma.clientPortalUser.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.permissions !== undefined && { permissions: JSON.stringify(data.permissions) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update portal user error:", error);
    return NextResponse.json({ error: "Failed to update portal user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.clientPortalUser.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });

    await prisma.clientPortalUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete portal user error:", error);
    return NextResponse.json({ error: "Failed to delete portal user" }, { status: 500 });
  }
}
