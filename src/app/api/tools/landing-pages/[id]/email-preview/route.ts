import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildLeadNotificationHtml } from "@/lib/email";
import { parseLpFormConfig } from "@/lib/lp-form-config";
import type { LpFormField } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/tools/landing-pages/[id]/email-preview
 *
 * Returns a rendered HTML email preview for the lead notification email.
 * Uses sample fields derived from the LP's own form (extracted from currentHtml)
 * so the preview is realistic for this specific LP.
 *
 * Body: { sampleFields?: Record<string, string> }
 * If sampleFields is omitted, we extract field labels from the HTML and generate
 * plausible sample values so the AI can produce a realistic summary.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      briefJson: true,
      currentHtml: true,
      clientId: true,
      formConfig: true,
    },
  });

  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let sampleFields: Record<string, string> | undefined;
  let fieldDefs: LpFormField[] | undefined;

  try {
    const body = await request.json() as { sampleFields?: Record<string, string> };
    sampleFields = body.sampleFields;
  } catch { /* no body — use auto-extracted */ }

  // Check whether formConfig has configured fields
  const formConfig = parseLpFormConfig(lp.formConfig);
  if (formConfig.fields && formConfig.fields.length > 0) {
    // Use configured fields: build sample data from the field definitions
    fieldDefs = formConfig.fields;
    if (!sampleFields || Object.keys(sampleFields).length === 0) {
      sampleFields = Object.fromEntries(fieldDefs.map((f) => [f.name, guessValueForField(f)]));
    }
  } else if (!sampleFields || Object.keys(sampleFields).length === 0) {
    // No configured fields and no provided sample — extract from HTML
    sampleFields = extractSampleFields(lp.currentHtml);
  }

  // Fetch client name
  let clientName: string | undefined;
  if (lp.clientId) {
    try {
      const c = await prisma.client.findUnique({ where: { id: lp.clientId }, select: { name: true } });
      clientName = c?.name ?? undefined;
    } catch { /* ignore */ }
  }

  const { html } = await buildLeadNotificationHtml({
    lpTitle: lp.title,
    clientName,
    briefJson: lp.briefJson,
    fields: sampleFields,
    fieldDefs,
    referrer: null,
    submittedAt: new Date(),
  });

  return NextResponse.json({ html });
}

/**
 * Extracts form field names/labels from the LP HTML and maps them to
 * realistic-looking sample values based on the field name.
 */
function extractSampleFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Extract <input name="..."> and <select name="..."> and <textarea name="...">
  const nameMatches = html.matchAll(/<(?:input|select|textarea)[^>]*\bname="([^"]+)"/gi);
  const names: string[] = [];
  for (const m of nameMatches) {
    if (m[1] && !names.includes(m[1])) names.push(m[1]);
  }

  for (const name of names) {
    fields[name] = guessValue(name);
  }

  // Fallback: if no named fields found, return generic sample
  if (Object.keys(fields).length === 0) {
    return {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@example.com",
      phone: "+44 7700 900123",
      message: "I would love to find out more. Please get in touch.",
    };
  }

  return fields;
}

function guessValue(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("first")) return "Sarah";
  if (n.includes("last") || n.includes("surname")) return "Johnson";
  if (n === "name" || n.includes("fullname")) return "Sarah Johnson";
  if (n.includes("parent")) return n.includes("last") ? "Johnson" : "Sarah";
  if (n.includes("player")) return n.includes("last") ? "Johnson" : "Tom";
  if (n.includes("email")) return "sarah.johnson@example.com";
  if (n.includes("phone") || n.includes("mobile") || n.includes("whatsapp")) return "+44 7700 900123";
  if (n.includes("dob") || n.includes("birth") || n.includes("date")) return "12/05/2016";
  if (n.includes("country")) return "United Kingdom";
  if (n.includes("message") || n.includes("enquiry") || n.includes("notes")) return "I would love to find out more. Please get in touch.";
  if (n.includes("camp") || n.includes("date") || n.includes("preferred")) return "Camp 3 · 26 Jul – 8 Aug";
  if (n.includes("age")) return "9";
  if (n.includes("position") || n.includes("role")) return "Midfielder";
  if (n.includes("school")) return "Riverside Primary School";
  if (n.includes("company") || n.includes("business")) return "Acme Ltd";
  if (n.includes("postcode") || n.includes("zip")) return "SW1A 1AA";
  if (n.includes("address")) return "12 High Street, London";
  if (n.includes("city") || n.includes("town")) return "London";
  return "Sample value";
}

function guessValueForField(field: LpFormField): string {
  const n = field.name.toLowerCase();
  const label = field.label.toLowerCase();

  if (field.type === "email") return "sarah.johnson@example.com";
  if (field.type === "tel") return "+44 7700 900123";
  if (field.type === "date") return "2026-07-26";
  if (field.type === "number") {
    if (n.includes("age") || label.includes("age")) return "9";
    return "2";
  }
  if (field.type === "textarea") {
    return "I would love to find out more. Please get in touch.";
  }
  if (field.type === "select") {
    const options = field.options ?? [];
    if (options.length > 0) {
      // Prefer the first non-placeholder option when possible.
      const firstReal = options.find((option) => option.value.trim() && option.label.trim());
      if (firstReal) return firstReal.label;
      return options[0].label || options[0].value;
    }
    if (n.includes("country") || label.includes("country")) return "United Kingdom";
    if (n.includes("duration") || label.includes("duration")) return "2 weeks";
    if (n.includes("camp") || label.includes("camp")) return "Camp 3 · 26 Jul – 8 Aug";
    if (n.includes("yes") || label.includes("yes") || label.includes("english language")) return "Yes";
  }

  const byName = guessValue(field.name);
  if (byName !== "Sample value") return byName;

  if (label.includes("country")) return "United Kingdom";
  if (label.includes("duration")) return "2 weeks";
  if (label.includes("camp")) return "Camp 3 · 26 Jul – 8 Aug";
  if (label.includes("age")) return "9";
  if (label.includes("message") || label.includes("enquiry")) return "I would love to find out more. Please get in touch.";
  return "Example response";
}
