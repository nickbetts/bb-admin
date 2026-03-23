import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const templates = await prisma.reportTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json({ error: "Failed to get templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await request.json();
    const { name, description, sections, isDefault } = data;
    if (!name || !sections) {
      return NextResponse.json({ error: "name and sections are required" }, { status: 400 });
    }
    if (isDefault) {
      await prisma.reportTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description: description ?? null,
        sections: JSON.stringify(sections),
        isDefault: isDefault ?? false,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
