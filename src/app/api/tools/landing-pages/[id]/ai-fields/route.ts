import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { extractFormFieldsFromHtml, type LpFormField, type LpFormFieldOption, type LpFormFieldType } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

interface RequestBody {
  prompt?: string;
  currentFields?: LpFormField[];
}

const VALID_TYPES: Set<LpFormFieldType> = new Set(["text", "email", "tel", "textarea", "select", "date", "number", "url"]);

function sanitiseOptions(options: unknown): LpFormFieldOption[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const cleaned = options
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const label = typeof (option as { label?: unknown }).label === "string" ? (option as { label: string }).label.trim() : "";
      const value = typeof (option as { value?: unknown }).value === "string" ? (option as { value: string }).value.trim() : "";
      const fallback = label || value;
      if (!fallback) return null;
      return {
        label: label || fallback,
        value: value || fallback,
      };
    })
    .filter((option): option is LpFormFieldOption => option !== null);

  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitiseFields(rawFields: unknown, existingFields: LpFormField[]): LpFormField[] {
  if (!Array.isArray(rawFields)) return existingFields;

  const existingById = new Map(existingFields.map((field) => [field.id, field]));
  const existingByName = new Map(existingFields.map((field) => [field.name, field]));
  const usedNames = new Set<string>();
  const result: LpFormField[] = [];

  for (const rawField of rawFields) {
    if (!rawField || typeof rawField !== "object") continue;
    const candidate = rawField as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name || usedNames.has(name)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) continue;

    const existing =
      (typeof candidate.id === "string" ? existingById.get(candidate.id) : undefined)
      ?? existingByName.get(name);

    const typeCandidate = typeof candidate.type === "string" ? candidate.type.trim().toLowerCase() as LpFormFieldType : existing?.type ?? "text";
    const type = VALID_TYPES.has(typeCandidate) ? typeCandidate : (existing?.type ?? "text");
    const label = typeof candidate.label === "string" && candidate.label.trim()
      ? candidate.label.trim()
      : (existing?.label ?? name);
    const placeholder = typeof candidate.placeholder === "string"
      ? candidate.placeholder.trim() || undefined
      : existing?.placeholder;
    const required = typeof candidate.required === "boolean" ? candidate.required : (existing?.required ?? false);
    const options = type === "select"
      ? sanitiseOptions(candidate.options) ?? existing?.options
      : undefined;

    result.push({
      id: existing?.id ?? crypto.randomUUID(),
      name,
      label,
      placeholder,
      type,
      options,
      required,
    });
    usedNames.add(name);
  }

  return result.length > 0 ? result : existingFields;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, currentHtml: true },
  });

  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentFields = Array.isArray(body.currentFields) && body.currentFields.length > 0
    ? body.currentFields
    : extractFormFieldsFromHtml(lp.currentHtml);

  try {
    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You modify landing page form field definitions. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            "Update the field definitions based on the request.",
            "Return the full final fields array, not a diff.",
            "Rules:",
            "- Preserve existing fields unless the request changes or removes them.",
            "- Keep field ids when provided for unchanged existing fields.",
            "- New fields need a sensible name attribute in snake_case.",
            "- Valid types: text, email, tel, textarea, select, date, number, url.",
            "- For select fields, return options as { label, value }.",
            "- Use British English in labels/placeholders.",
            "- Do not mention styling or HTML wrappers; only field schema.",
            "JSON shape:",
            '{"fields":[{"id":"existing-or-new","name":"country","label":"Country of participant","placeholder":"England, Spain, Australia","type":"text","required":true,"options":[]}]}',
            "Current fields:",
            JSON.stringify(currentFields),
            "Request:",
            prompt,
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 1800,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { fields?: unknown };
    const fields = sanitiseFields(parsed.fields, currentFields);
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("[ai-fields] Failed to update field definitions:", error);
    return NextResponse.json({ error: "Could not update fields with AI" }, { status: 500 });
  }
}