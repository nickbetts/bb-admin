import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        trackingSetups: {
          select: {
            id: true,
            clientId: true,
            gtmContainerId: true,
            ga4PropertyId: true,
            metaPixelId: true,
            googleAdsConversionId: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
