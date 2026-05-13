import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { extractFormFieldsFromHtml, type LpFormField, type LpFormFieldOption } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

type SelectOptionSource = "native" | "dom" | "ai" | "none";

interface FormFieldDiagnostics {
  selectOptionSources: Record<string, SelectOptionSource>;
  domEnhancedCount: number;
  aiEnhancedCount: number;
}

function inferSelectOptionsWithDom(
  html: string,
  fields: LpFormField[],
): { fields: LpFormField[]; enhancedNames: string[] } {
  const unresolvedSelects = fields.filter((field) => field.type === "select" && field.name && (!field.options || field.options.length === 0));
  if (unresolvedSelects.length === 0) return { fields, enhancedNames: [] };

  const $ = load(html);
  const unresolvedNames = new Set(unresolvedSelects.map((field) => field.name));
  const enhancedNames = new Set<string>();
  const byName = new Map<string, { placeholder?: string; options: LpFormFieldOption[] }>();

  $("select[name]").each((_, element) => {
    const name = ($(element).attr("name") || "").trim();
    if (!name || !unresolvedNames.has(name) || byName.has(name)) return;

    const placeholderAttr = ($(element).attr("placeholder") || $(element).attr("data-placeholder") || "").trim();
    let placeholder = placeholderAttr || undefined;
    const options: LpFormFieldOption[] = [];

    $(element).find("option").each((index, optionEl) => {
      const option = $(optionEl);
      const text = option.text().replace(/\s+/g, " ").trim();
      const rawValue = option.attr("value");
      const value = (rawValue ?? text).trim();
      const disabled = option.is("[disabled]");
      const selected = option.is("[selected]");

      const isLikelyPlaceholder =
        (index === 0 && ((rawValue ?? "") === "" || disabled || selected))
        || ((rawValue ?? "") === "" && !!text);

      if (isLikelyPlaceholder) {
        if (!placeholder && text) placeholder = text;
        return;
      }

      if (!text && !value) return;
      options.push({ label: text || value, value: value || text });
    });

    if (options.length > 0) {
      byName.set(name, { placeholder, options });
      enhancedNames.add(name);
    }
  });

  if (enhancedNames.size === 0) return { fields, enhancedNames: [] };

  return {
    fields: fields.map((field) => {
      if (field.type !== "select") return field;
      if (field.options && field.options.length > 0) return field;

      const recovered = byName.get(field.name);
      if (!recovered) return field;

      return {
        ...field,
        placeholder: field.placeholder || recovered.placeholder,
        options: recovered.options,
      };
    }),
    enhancedNames: Array.from(enhancedNames),
  };
}

async function inferSelectOptionsWithAi(
  html: string,
  fields: LpFormField[],
): Promise<{ fields: LpFormField[]; enhancedNames: string[] }> {
  const unresolvedSelects = fields.filter((field) => field.type === "select" && field.name && (!field.options || field.options.length === 0));
  if (unresolvedSelects.length === 0) return { fields, enhancedNames: [] };

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

    const enhancedNames: string[] = [];
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

    return {
      fields: fields.map((field) => {
      if (field.type !== "select") return field;
      if (field.options && field.options.length > 0) return field;

      const inferred = inferredByName.get(field.name);
      if (!inferred || inferred.options.length === 0) return field;

      enhancedNames.push(field.name);

      return {
        ...field,
        placeholder: field.placeholder || inferred.placeholder,
        options: inferred.options,
      };
      }),
      enhancedNames,
    };
  } catch (error) {
    console.warn("[form-fields] AI select option inference skipped:", error);
    return { fields, enhancedNames: [] };
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

  const nativeFields = extractFormFieldsFromHtml(lp.currentHtml);
  const nativeSelectNames = new Set(
    nativeFields
      .filter((field) => field.type === "select" && field.options && field.options.length > 0)
      .map((field) => field.name),
  );

  const domRecovery = inferSelectOptionsWithDom(lp.currentHtml, nativeFields);
  const aiRecovery = await inferSelectOptionsWithAi(lp.currentHtml, domRecovery.fields);

  const finalFields = aiRecovery.fields;
  const diagnostics: FormFieldDiagnostics = {
    selectOptionSources: {},
    domEnhancedCount: domRecovery.enhancedNames.length,
    aiEnhancedCount: aiRecovery.enhancedNames.length,
  };

  const domEnhanced = new Set(domRecovery.enhancedNames);
  const aiEnhanced = new Set(aiRecovery.enhancedNames);
  for (const field of finalFields) {
    if (field.type !== "select") continue;
    if (nativeSelectNames.has(field.name)) diagnostics.selectOptionSources[field.name] = "native";
    else if (domEnhanced.has(field.name)) diagnostics.selectOptionSources[field.name] = "dom";
    else if (aiEnhanced.has(field.name)) diagnostics.selectOptionSources[field.name] = "ai";
    else diagnostics.selectOptionSources[field.name] = "none";
  }

  return NextResponse.json({ fields: finalFields, diagnostics });
}
