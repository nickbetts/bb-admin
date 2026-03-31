import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { reports: true } },
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Get clients error:", error);
    return NextResponse.json({ error: "Failed to get clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      website,
      semrushDomain,
      semrushProjectId,
      ga4PropertyId,
      ga4PropertyName,
      metaAccountId,
      metaAccountName,
      googleAdsCustomerId,
      googleAdsAccountName,
      searchConsoleSiteUrl,
      aiReportInstructions,
    } = data;

    if (!name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const client = await prisma.client.create({
      data: {
        name,
        slug,
        website: website || null,
        semrushDomain: semrushDomain || null,
        semrushProjectId: semrushProjectId ?? null,
        ga4PropertyId: ga4PropertyId || null,
        ga4PropertyName: ga4PropertyName || null,
        metaAccountId: metaAccountId || null,
        metaAccountName: metaAccountName || null,
        googleAdsCustomerId: googleAdsCustomerId || null,
        googleAdsAccountName: googleAdsAccountName || null,
        searchConsoleSiteUrl: searchConsoleSiteUrl || null,
        aiReportInstructions: aiReportInstructions || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
