import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { extractFormFieldsFromHtml } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/tools/landing-pages/[id]/form-fields
 *
 * Extracts field definitions from the LP's current HTML and returns them
 * as a list of LpFormField objects based on the live form markup.
 * Used by the form field editor sidebar to pre-populate fields on first use.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, currentHtml: true },
  });

  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = extractFormFieldsFromHtml(lp.currentHtml);
  return NextResponse.json({ fields });
}
