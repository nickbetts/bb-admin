import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import type { LpFieldStyleTemplate } from "@/lib/lp-form-fields-html";

export const dynamic = "force-dynamic";

interface RequestBody {
  html?: string;
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
  if (!html) {
    return NextResponse.json({ template: {} });
  }

  try {
    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You extract CSS class templates for HTML form fields. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            "From the HTML, identify the dominant styling classes used for form field wrappers and controls.",
            "Return JSON exactly with keys: wrapperClass, labelClass, inputClass, textareaClass, selectClass.",
            "Use empty string when unknown.",
            "Do not invent framework classes that are not present in HTML.",
            "HTML:",
            html.slice(0, 30000),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const template: LpFieldStyleTemplate = {
      wrapperClass: typeof parsed.wrapperClass === "string" ? parsed.wrapperClass.trim() || undefined : undefined,
      labelClass: typeof parsed.labelClass === "string" ? parsed.labelClass.trim() || undefined : undefined,
      inputClass: typeof parsed.inputClass === "string" ? parsed.inputClass.trim() || undefined : undefined,
      textareaClass: typeof parsed.textareaClass === "string" ? parsed.textareaClass.trim() || undefined : undefined,
      selectClass: typeof parsed.selectClass === "string" ? parsed.selectClass.trim() || undefined : undefined,
    };

    return NextResponse.json({ template, source: "ai" });
  } catch (error) {
    console.warn("[form-style-template] AI extraction failed:", error);
    return NextResponse.json({ template: {}, source: "none" });
  }
}
