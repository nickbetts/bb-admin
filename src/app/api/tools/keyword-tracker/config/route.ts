import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface TrackerClient {
  domain: string;
  name: string;
  campaignIds: string[];
}

async function getSemrushClients(): Promise<TrackerClient[]> {
  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) return [];

  // Fetch all SEMrush projects
  let semrushProjects: { projectId: number; projectName: string; domain: string }[] = [];
  try {
    const res = await fetch(`https://api.semrush.com/management/v1/projects?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json() as { project_id: number; project_name: string; domain_unicode: string }[];
      semrushProjects = data.map((p) => ({
        projectId: p.project_id,
        projectName: p.project_name,
        domain: p.domain_unicode,
      }));
    }
  } catch { /* fall through */ }

  // Fetch Stratos clients with SEMrush config for name + campaign ID enrichment
  const stratosClients = await prisma.client.findMany({
    where: { semrushDomain: { not: null } },
    select: { name: true, semrushDomain: true, semrushCampaignIds: true },
  });

  const stratosByDomain = new Map<string, { name: string; campaignIds: string[] }>();
  for (const c of stratosClients) {
    if (!c.semrushDomain) continue;
    const domain = c.semrushDomain.toLowerCase().replace(/^www\./, "");
    const campaignIds: string[] = c.semrushCampaignIds
      ? (JSON.parse(c.semrushCampaignIds) as string[])
      : [];
    stratosByDomain.set(domain, { name: c.name, campaignIds });
  }

  if (semrushProjects.length > 0) {
    // Merge: use SEMrush project list as source of truth, enrich with Stratos names/campaigns
    return semrushProjects.map((p) => {
      const normDomain = p.domain.toLowerCase().replace(/^www\./, "");
      const stratos = stratosByDomain.get(normDomain);
      return {
        domain: p.domain,
        name: stratos?.name ?? p.projectName,
        campaignIds: stratos?.campaignIds ?? [],
      };
    });
  }

  // Fallback: just return Stratos-configured clients
  return stratosClients
    .filter((c) => c.semrushDomain)
    .map((c) => ({
      domain: c.semrushDomain!,
      name: c.name,
      campaignIds: c.semrushCampaignIds ? (JSON.parse(c.semrushCampaignIds) as string[]) : [],
    }));
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [lists, semrushClients] = await Promise.all([
    prisma.keywordTrackerList.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    getSemrushClients(),
  ]);

  semrushClients.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ lists, semrushClients });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await request.json();
  const { name, keywords, clientIds, database } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const list = await prisma.keywordTrackerList.create({
    data: {
      userId,
      name,
      keywords: JSON.stringify(keywords ?? []),
      clientIds: JSON.stringify(clientIds ?? []),
      database: database ?? "uk",
    },
  });

  return NextResponse.json({ list });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.keywordTrackerList.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, keywords, clientIds, database } = body;

  const list = await prisma.keywordTrackerList.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(keywords !== undefined && { keywords: JSON.stringify(keywords) }),
      ...(clientIds !== undefined && { clientIds: JSON.stringify(clientIds) }),
      ...(database !== undefined && { database }),
    },
  });

  return NextResponse.json({ list });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.keywordTrackerList.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.keywordTrackerList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
