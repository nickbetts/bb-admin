import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// A user can manage a template if they own it, if it predates ownership
// tracking (legacy null owner), or if they hold the settings permission.
function canManage(
  session: { user: { id: string; permissions: string[] } },
  template: { ownerUserId: string | null },
): boolean {
  return (
    template.ownerUserId === null ||
    template.ownerUserId === session.user.id ||
    session.user.permissions.includes("settings")
  );
}

// PATCH /api/tools/llm-generator/templates/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.llmTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    action?: string;
    name?: string;
    sector?: string;
    description?: string;
    templateText?: string;
    promptGuidance?: string;
  };

  // Clone — create a user-owned editable copy of any template (incl. built-ins).
  if (body.action === "clone") {
    const clone = await prisma.llmTemplate.create({
      data: {
        name: body.name?.trim() || `${existing.name} (copy)`,
        sector: existing.sector,
        description: existing.description,
        templateText: existing.templateText,
        promptGuidance: existing.promptGuidance,
        isBuiltIn: false,
        ownerUserId: session.user.id,
        ownerEmail: session.user.email,
      },
    });
    return NextResponse.json({ template: clone });
  }

  if (existing.isBuiltIn)
    return NextResponse.json({ error: "Built-in templates cannot be edited" }, { status: 403 });
  if (!canManage(session, existing)) {
    return NextResponse.json({ error: "You can only edit templates you created" }, { status: 403 });
  }

  const { name, sector, description, templateText, promptGuidance } = body;

  const template = await prisma.llmTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(sector !== undefined && { sector: sector.trim() }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(templateText !== undefined && { templateText: templateText.trim() }),
      ...(promptGuidance !== undefined && { promptGuidance: promptGuidance.trim() || null }),
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
  if (existing.isBuiltIn)
    return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 403 });
  if (!canManage(session, existing)) {
    return NextResponse.json(
      { error: "You can only delete templates you created" },
      { status: 403 },
    );
  }

  await prisma.llmTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
