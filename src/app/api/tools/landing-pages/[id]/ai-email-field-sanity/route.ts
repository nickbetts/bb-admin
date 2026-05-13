import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import type { LpFormField, LpFormFieldOption, LpFormFieldType } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

interface RequestBody {
  fields?: LpFormField[];
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
      return { label: label || fallback, value: value || fallback };
    })
    .filter((option): option is LpFormFieldOption => option !== null);

  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitiseFields(rawFields: unknown, existingFields: LpFormField[]): LpFormField[] {
  if (!Array.isArray(rawFields)) return existingFields;

  const existingById = new Map(existingFields.map((field) => [field.id, field]));
  const existingByName = new Map(existingFields.map((field) => [field.name, field]));
  const usedNames = new Set<string>();
  const next: LpFormField[] = [];

  for (const rawField of rawFields) {
    if (!rawField || typeof rawField !== "object") continue;
    const candidate = rawField as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name || usedNames.has(name) || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) continue;

    const existing =
      (typeof candidate.id === "string" ? existingById.get(candidate.id) : undefined)
      ?? existingByName.get(name);

    const typeCandidate = typeof candidate.type === "string"
      ? candidate.type.trim().toLowerCase() as LpFormFieldType
      : existing?.type ?? "text";
    const type = VALID_TYPES.has(typeCandidate) ? typeCandidate : (existing?.type ?? "text");

    const label = typeof candidate.label === "string" && candidate.label.trim()
      ? candidate.label.trim()
      : (existing?.label ?? name);

    const placeholder = typeof candidate.placeholder === "string"
      ? candidate.placeholder.trim() || undefined
      : existing?.placeholder;

    const required = typeof candidate.required === "boolean"
      ? candidate.required
      : (existing?.required ?? false);

    const options = type === "select"
      ? sanitiseOptions(candidate.options) ?? existing?.options
      : undefined;

    next.push({
      id: existing?.id ?? crypto.randomUUID(),
      name,
      label,
      placeholder,
      type,
      required,
      options,
    });
    usedNames.add(name);
  }

  return next.length > 0 ? next : existingFields;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (fields.length === 0) return NextResponse.json({ fields: [] });

  try {
    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You improve landing page form field definitions for clear lead-notification emails. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            "Sense-check these fields for email readability and realistic previews.",
            "Keep the same order and names unless a label/placeholder is clearly poor.",
            "Do not remove fields. Do not add fields.",
            "Keep types unchanged unless a type is clearly invalid.",
            "Fix only: label wording, placeholder quality, and obvious select option labelling.",
            "Use British English.",
            "Return the full array in JSON shape: {\"fields\":[...]}.",
            "Fields:",
            JSON.stringify(fields),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 1400,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { fields?: unknown };
    const saneFields = sanitiseFields(parsed.fields, fields);

    return NextResponse.json({ fields: saneFields, source: "ai" });
  } catch (error) {
    console.warn("[ai-email-field-sanity] AI sanity check failed:", error);
    return NextResponse.json({ fields, source: "none" });
  }
}
