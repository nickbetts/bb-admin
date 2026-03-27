import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/tools/llm-generator/templates/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.llmTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.isBuiltIn) return NextResponse.json({ error: "Built-in templates cannot be edited" }, { status: 403 });

  const body = await request.json() as { name?: string; sector?: string; description?: string; templateText?: string };
  const { name, sector, description, templateText } = body;

  const template = await prisma.llmTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(sector !== undefined && { sector: sector.trim() }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(templateText !== undefined && { templateText: templateText.trim() }),
    },
  });

  return NextResponse.json({ template });
}

// DELETE /api/tools/llm-generator/templates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.llmTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.isBuiltIn) return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 403 });

  await prisma.llmTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
