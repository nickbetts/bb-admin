import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const template = await prisma.reportTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json({ error: "Failed to get template" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const data = await request.json();
    const updateData: {
      name?: string;
      description?: string | null;
      sections?: string;
      isDefault?: boolean;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sections !== undefined) updateData.sections = JSON.stringify(data.sections);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    const template = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.reportTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.reportTemplate.update({ where: { id }, data: updateData });
    });
    return NextResponse.json(template);
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.reportTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
