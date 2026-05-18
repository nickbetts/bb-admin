import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClickUpTaskWithChecklist } from "@/lib/clickup";

export const dynamic = "force-dynamic";

interface CreateTaskBody {
  listId?: string;
  taskName?: string;
  description?: string;
  checklistItems?: string[];
  assignees?: number[];
  dueDate?: string; // ISO date string e.g. "2026-05-20"
  dueDateHasTime?: boolean;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const body = (await request.json()) as CreateTaskBody;

    if (!body.listId || !body.taskName) {
      return NextResponse.json({ error: "listId and taskName are required" }, { status: 400 });
    }

    const dueDateMs = body.dueDate ? new Date(body.dueDate).getTime() : undefined;

    const result = await createClickUpTaskWithChecklist(
      body.listId,
      body.taskName,
      body.checklistItems ?? [],
      body.assignees,
      dueDateMs,
      body.description,
      undefined,
      body.dueDateHasTime === true,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ClickUp create task error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
