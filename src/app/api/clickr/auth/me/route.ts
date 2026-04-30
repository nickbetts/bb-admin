import { NextResponse } from "next/server";
import { getClickrSession } from "@/lib/clickr-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getClickrSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return fresh data from DB so planTier / lpsThisMonth is always up to date
  try {
    const user = await prisma.clickrUser.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        planTier: true,
        planStatus: true,
        lpsThisMonth: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr /me error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
