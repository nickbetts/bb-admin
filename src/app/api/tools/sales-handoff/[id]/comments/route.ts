import { NextRequest, NextResponse } from "next/server";

import { getSession, hasPermission } from "@/lib/auth";
import { createClickUpTaskComment, getClickUpTaskComments } from "@/lib/clickup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getHandoffForComments(id: string) {
  return prisma.salesHandoff.findUnique({
    where: { id },
    select: {
      id: true,
      clickupTaskId: true,
    },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const handoff = await getHandoffForComments(id);

    if (!handoff) {
      return NextResponse.json({ error: "Sales handoff not found" }, { status: 404 });
    }

    if (!handoff.clickupTaskId) {
      return NextResponse.json({ comments: [] });
    }

    const comments = await getClickUpTaskComments(handoff.clickupTaskId);
    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff comments GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const handoff = await getHandoffForComments(id);

    if (!handoff) {
      return NextResponse.json({ error: "Sales handoff not found" }, { status: 404 });
    }

    if (!handoff.clickupTaskId) {
      return NextResponse.json(
        { error: "This handoff does not have a ClickUp task yet" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { body?: string };
    const commentText = cleanText(body.body);
    if (!commentText) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const comment = await createClickUpTaskComment({
      taskId: handoff.clickupTaskId,
      commentText,
      notifyAll: false,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff comments POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
