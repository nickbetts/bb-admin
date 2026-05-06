import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";

// Generic editor used by inline contenteditable elements and × delete buttons
// rendered into the grand-plan iframe. Each edit creates a new version so the
// strategist can always step back via undo (which simply restores the prior
// version).
//
// Body shape:
//   { action: "set",    path: "sections.audiences.0.name", value: "…" }
//   { action: "delete", path: "sections.audiences.0" }                   // array element
//   { action: "undo" }
//
// Paths use dot-notation. Numeric segments index into arrays.

const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function parsePath(path: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const raw of path.split(".")) {
    const seg = raw.trim();
    if (!seg) continue;
    if (FORBIDDEN_PATH_SEGMENTS.has(seg)) {
      throw new Error(`Forbidden path segment: ${seg}`);
    }
    if (/^\d+$/.test(seg)) out.push(parseInt(seg, 10));
    else out.push(seg);
  }
  if (!out.length) throw new Error("Path is empty");
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getParent(root: any, segments: (string | number)[]): { parent: any; key: string | number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const k = segments[i];
    if (cur == null) throw new Error(`Path does not exist at "${segments.slice(0, i + 1).join(".")}"`);
    cur = cur[k];
  }
  if (cur == null) throw new Error(`Path parent missing for "${segments.join(".")}"`);
  return { parent: cur, key: segments[segments.length - 1] };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as { action?: string; path?: string; value?: unknown };
  const action = body.action;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: {
      planDataJson: true,
      userId: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 2, select: { id: true, versionNumber: true, generatedHtml: true, planDataJson: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Undo: restore the previous version (versions[1]), recording the restore
  // as a new version so the user can redo by undoing again.
  if (action === "undo") {
    const prev = plan.versions[1];
    if (!prev) return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
    const nextVersion = (plan.versions[0]?.versionNumber ?? 0) + 1;
    await prisma.$transaction([
      prisma.grandPlan.update({
        where: { id },
        data: { generatedHtml: prev.generatedHtml, planDataJson: prev.planDataJson },
      }),
      prisma.grandPlanVersion.create({
        data: {
          grandPlanId: id,
          versionNumber: nextVersion,
          generatedHtml: prev.generatedHtml,
          planDataJson: prev.planDataJson,
          prompt: `Undo (restored v${prev.versionNumber})`,
        },
      }),
    ]);
    return NextResponse.json({ html: prev.generatedHtml, undone: true });
  }

  if (!plan.planDataJson) return NextResponse.json({ error: "No plan data" }, { status: 400 });

  let planData: GrandPlanData;
  try {
    planData = JSON.parse(plan.planDataJson);
  } catch {
    return NextResponse.json({ error: "Invalid plan data" }, { status: 400 });
  }

  if (typeof body.path !== "string" || !body.path.trim()) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  let segments: (string | number)[];
  try {
    segments = parsePath(body.path);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad path" }, { status: 400 });
  }

  let prompt = "";

  if (action === "set") {
    if (typeof body.value !== "string") {
      return NextResponse.json({ error: "value must be a string" }, { status: 400 });
    }
    try {
      const { parent, key } = getParent(planData, segments);
      // Only allow updating existing keys/indices — never create new structure.
      if (Array.isArray(parent)) {
        const idx = typeof key === "number" ? key : parseInt(String(key), 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= parent.length) {
          return NextResponse.json({ error: `Index out of range: ${key}` }, { status: 400 });
        }
        if (typeof parent[idx] !== "string" && parent[idx] != null) {
          return NextResponse.json({ error: `Cannot set non-string array element at ${body.path}` }, { status: 400 });
        }
        parent[idx] = body.value;
      } else {
        const current = parent[key];
        if (current != null && typeof current !== "string") {
          return NextResponse.json({ error: `Cannot set non-string field at ${body.path}` }, { status: 400 });
        }
        parent[key] = body.value;
      }
      prompt = `Edited ${body.path}`;
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Set failed" }, { status: 400 });
    }
  } else if (action === "delete") {
    try {
      const { parent, key } = getParent(planData, segments);
      if (Array.isArray(parent)) {
        const idx = typeof key === "number" ? key : parseInt(String(key), 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= parent.length) {
          return NextResponse.json({ error: `Index out of range: ${key}` }, { status: 400 });
        }
        parent.splice(idx, 1);
      } else {
        if (!(key in parent)) {
          return NextResponse.json({ error: `Unknown field: ${body.path}` }, { status: 400 });
        }
        delete parent[key];
      }
      prompt = `Deleted ${body.path}`;
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const html = renderGrandPlanHtml(planData);
  const nextVersion = (plan.versions[0]?.versionNumber ?? 0) + 1;

  await prisma.$transaction([
    prisma.grandPlan.update({
      where: { id },
      data: { generatedHtml: html, planDataJson: JSON.stringify(planData) },
    }),
    prisma.grandPlanVersion.create({
      data: {
        grandPlanId: id,
        versionNumber: nextVersion,
        generatedHtml: html,
        planDataJson: JSON.stringify(planData),
        prompt,
      },
    }),
  ]);

  return NextResponse.json({ html });
}
