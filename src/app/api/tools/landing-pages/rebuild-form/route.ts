import { load } from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import type { LpFormField } from "@/lib/lp-form-config";

export const dynamic = "force-dynamic";

interface RequestBody {
  html?: string;
  fields?: LpFormField[];
}

function extractCurrentForm(html: string): string | null {
  const $ = load(html);
  const form = $("form[data-lp-form='true']").first();
  if (!form.length) return null;
  return form.prop("outerHTML") ?? form.toString();
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

  const html = (body.html ?? "").trim();
  const currentFormHtml = html ? extractCurrentForm(html) : null;
  const fields = Array.isArray(body.fields) ? body.fields.filter((field) => field?.name) : [];

  if (!html || !currentFormHtml || fields.length === 0) {
    return NextResponse.json({ formHtml: currentFormHtml ?? "" });
  }

  try {
    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You rebuild HTML forms from examples. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            "Rebuild the form HTML so it matches the provided field definitions exactly.",
            "Use the current form as the visual/style reference and preserve existing classes, spacing, wrappers, button styling, and overall layout pattern.",
            "Requirements:",
            "- Return a complete <form data-lp-form=\"true\">...</form> fragment only.",
            "- Keep the same general structure, look, and feel as the reference form.",
            "- Use the provided fields in the exact order.",
            "- Remove any fields not in the list.",
            "- Preserve required attributes and field types.",
            "- For select fields, include options from the field definition.",
            "- Keep the existing submit button copy and styling as close as possible.",
            "- Do not invent a new design language.",
            "- If you need a field wrapper class, reuse the existing wrapper/class pattern from the reference form.",
            "Return JSON exactly in this shape: {\"formHtml\":\"...\"}",
            "Field definitions:",
            JSON.stringify(fields),
            "Reference form HTML:",
            currentFormHtml.slice(0, 30000),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
      max_completion_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { formHtml?: string };
    const formHtml = (parsed.formHtml ?? "").trim();

    if (!formHtml) {
      return NextResponse.json({ error: "AI did not return form HTML" }, { status: 500 });
    }

    return NextResponse.json({ formHtml, source: "ai" });
  } catch (error) {
    console.warn("[rebuild-form] AI form rebuild failed:", error);
    return NextResponse.json({ error: "Could not rebuild form" }, { status: 500 });
  }
}
