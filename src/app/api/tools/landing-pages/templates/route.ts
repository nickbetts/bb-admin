import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/templates — list templates
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const templates = await prisma.landingPageTemplate.findMany({
      orderBy: [{ isBuiltIn: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        thumbnailUrl: true,
        promptGuidance: true,
        isBuiltIn: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Landing page templates error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tools/landing-pages/templates — save LP as template
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    name: string;
    description?: string;
    category: string;
    html: string;
    promptGuidance?: string;
  };

  if (!body.name || !body.category || !body.html) {
    return NextResponse.json({ error: "name, category, and html are required" }, { status: 400 });
  }

  const template = await prisma.landingPageTemplate.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      category: body.category,
      html: body.html,
      promptGuidance: body.promptGuidance ?? null,
      isBuiltIn: false,
      createdBy: session.user.email,
    },
  });

  return NextResponse.json({ template });
}
