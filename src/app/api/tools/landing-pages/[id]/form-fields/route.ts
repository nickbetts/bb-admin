import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { extractFormFieldsFromHtml, type LpFormField, type LpFormFieldOption } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

async function inferSelectOptionsWithAi(
  html: string,
  fields: LpFormField[],
): Promise<LpFormField[]> {
  const unresolvedSelects = fields.filter((field) => field.type === "select" && field.name && (!field.options || field.options.length === 0));
  if (unresolvedSelects.length === 0) return fields;

  try {
    const openai = await getOpenAiClient();
    const candidateNames = unresolvedSelects.map((field) => field.name);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You extract dropdown options from HTML forms. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            "Find select options for these field names and infer values when missing.",
            `Field names: ${JSON.stringify(candidateNames)}`,
            "Rules:",
            "- Return only names provided.",
            "- If option value is missing, use the option text as value.",
            "- Exclude blank placeholder options from options array, but set placeholder string.",
            "- If unsure, return empty options for that field.",
            "JSON format:",
            '{"selects":[{"name":"camp","placeholder":"Select camp","options":[{"label":"Camp A","value":"camp-a"}]}]}',
            "HTML:",
            html.slice(0, 25000),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      selects?: Array<{ name?: string; placeholder?: string; options?: Array<{ label?: string; value?: string }> }>;
    };

    const inferredByName = new Map<string, { placeholder?: string; options: LpFormFieldOption[] }>();
    for (const item of parsed.selects ?? []) {
      const name = item.name?.trim();
      if (!name || !candidateNames.includes(name)) continue;
      const options = (item.options ?? [])
        .map((option) => ({
          label: (option.label ?? "").trim(),
          value: (option.value ?? "").trim(),
        }))
        .map((option) => {
          const fallback = option.label || option.value;
          return {
            label: option.label || fallback,
            value: option.value || fallback,
          };
        })
        .filter((option) => option.label && option.value);

      inferredByName.set(name, {
        placeholder: item.placeholder?.trim() || undefined,
        options,
      });
    }

    return fields.map((field) => {
      if (field.type !== "select") return field;
      if (field.options && field.options.length > 0) return field;

      const inferred = inferredByName.get(field.name);
      if (!inferred || inferred.options.length === 0) return field;

      return {
        ...field,
        placeholder: field.placeholder || inferred.placeholder,
        options: inferred.options,
      };
    });
  } catch (error) {
    console.warn("[form-fields] AI select option inference skipped:", error);
    return fields;
  }
}

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

  const extractedFields = extractFormFieldsFromHtml(lp.currentHtml);
  const fields = await inferSelectOptionsWithAi(lp.currentHtml, extractedFields);
  return NextResponse.json({ fields });
}
