import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectCompetitors, validateCompetitor } from "@/lib/competitor-research";

// Competitor research helpers for the Grand Plan creation form.
// Mirrors the content-strategy flow: auto-detect via SEMrush + manual add via
// validate (which also scrapes the homepage when SEMrush has no overlap).
//
// Requires a domain — either resolved from `clientId` (uses client.semrushDomain
// or websiteUrl) or passed directly as `domain` (for prospect/orphan plans).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      action: "detect" | "validate";
      clientId?: string;
      domain?: string;
      competitor?: string;
      database?: string;
    };

    let domain = body.domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") || "";

    if (!domain && body.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
        select: { semrushDomain: true, website: true },
      });
      if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      domain = (client.semrushDomain || client.website || "")
        .trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    }

    if (!domain) {
      return NextResponse.json(
        { error: "domain is required (set client SEMrush/website URL or pass `domain` directly)" },
        { status: 400 },
      );
    }

    const db = body.database || "uk";

    if (body.action === "detect") {
      const competitors = await detectCompetitors(domain, db);
      return NextResponse.json({ competitors });
    }

    if (body.action === "validate") {
      const competitor = body.competitor?.trim().toLowerCase()
        .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      if (!competitor) return NextResponse.json({ error: "competitor is required" }, { status: 400 });
      const result = await validateCompetitor(domain, competitor, db);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action — expected 'detect' or 'validate'" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("grand-plan competitors error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
