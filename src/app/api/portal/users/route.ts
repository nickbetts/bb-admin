import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREVIEW_PORTAL_EMAIL_PREFIX } from "@/app/api/clients/[id]/portal-preview/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.clientPortalUser.findMany({
      where: { NOT: { email: { startsWith: PREVIEW_PORTAL_EMAIL_PREFIX } } },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("List portal users error:", error);
    return NextResponse.json({ error: "Failed to list portal users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json() as {
      clientId: string;
      email: string;
      name?: string;
      permissions?: string[];
    };

    if (!data.clientId || !data.email) {
      return NextResponse.json({ error: "clientId and email are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const existing = await prisma.clientPortalUser.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const user = await prisma.clientPortalUser.create({
      data: {
        clientId: data.clientId,
        email: data.email,
        name: data.name ?? null,
        permissions: JSON.stringify(data.permissions ?? ["reports", "grand_plans", "content_strategies", "landing_pages", "tasks"]),
        isActive: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Create portal user error:", error);
    return NextResponse.json({ error: "Failed to create portal user" }, { status: 500 });
  }
}
