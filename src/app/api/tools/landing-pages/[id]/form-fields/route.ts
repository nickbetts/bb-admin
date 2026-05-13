import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LpFormField, LpFormFieldType } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/tools/landing-pages/[id]/form-fields
 *
 * Extracts field definitions from the LP's current HTML and returns them
 * as a list of LpFormField objects with auto-generated labels.
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

  const fields = extractFieldDefs(lp.currentHtml);
  return NextResponse.json({ fields });
}

function extractFieldDefs(html: string): LpFormField[] {
  const fields: LpFormField[] = [];
  const seen = new Set<string>();

  // Match all input/select/textarea elements, capturing name and type attributes
  const elementRe = /<(input|select|textarea)([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = elementRe.exec(html)) !== null) {
    const tagName = m[1].toLowerCase();
    const attrs = m[2];

    const nameMatch = attrs.match(/\bname="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (seen.has(name)) continue;
    seen.add(name);

    // Determine type
    let type: LpFormFieldType = "text";
    if (tagName === "textarea") {
      type = "textarea";
    } else if (tagName === "select") {
      type = "select";
    } else {
      const typeMatch = attrs.match(/\btype="([^"]+)"/i);
      const rawType = typeMatch ? typeMatch[1].toLowerCase() : "text";
      if (rawType === "email") type = "email";
      else if (rawType === "tel") type = "tel";
      else if (rawType === "date") type = "date";
      else if (rawType === "number") type = "number";
      else if (rawType === "url") type = "url";
      else if (rawType === "hidden") continue; // skip hidden fields
    }

    // Auto-detect required
    const required = /\brequired\b/i.test(attrs);
    const placeholderMatch = attrs.match(/\bplaceholder=("([^"]*)"|'([^']*)')/i);
    const placeholder = (placeholderMatch?.[2] ?? placeholderMatch?.[3] ?? "").trim() || undefined;

    fields.push({
      id: crypto.randomUUID(),
      name,
      label: formatFieldLabel(name),
      placeholder,
      type,
      required,
    });
  }

  return fields;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
