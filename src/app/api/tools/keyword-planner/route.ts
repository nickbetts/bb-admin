import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateKeywordIdeas, getGoogleAdsAccounts } from "@/lib/google-ads";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SuggestBody {
  action: "suggest";
  website: string;
  brief: string;
  location?: string;
  language?: string;
}

interface ResearchBody {
  action: "research";
  keywords: string[];
  website?: string;
  customerId?: string;
  location?: string;
  language?: string;
}

type RequestBody = SuggestBody | ResearchBody;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as RequestBody;

    // ── action: suggest ────────────────────────────────────────────────────────
    if (body.action === "suggest") {
      const { website, brief } = body;
      if (!website || !brief) {
        return NextResponse.json(
          { error: "website and brief are required" },
          { status: 400 }
        );
      }

      const apiKeySetting = await prisma.appSetting.findUnique({
        where: { key: "openaiApiKey" },
      });
      const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key not configured. Add it in Settings." },
          { status: 400 }
        );
      }

      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an expert Google Ads keyword strategist. Given a website URL and a brief description of a new sales lead or campaign, generate a list of high-intent search keywords suitable for a Google Ads campaign.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "keywords": ["keyword one", "keyword two", ...],
  "rationale": "Brief 2-3 sentence explanation of the keyword strategy."
}

Rules:
- Generate 25-35 keywords
- Mix broad head terms and specific long-tail keywords
- Include commercial intent phrases (buy, hire, service, cost, near me, UK etc.)
- Include competitor/comparison terms where relevant
- No brand-specific terms unless explicitly in the brief
- Keep keywords concise (2-5 words each)`,
          },
          {
            role: "user",
            content: `Website: ${website}\n\nClient brief: ${brief}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: { keywords?: string[]; rationale?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Try to extract JSON from the response if it has surrounding text
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            parsed = { keywords: [], rationale: "Could not parse AI response." };
          }
        } else {
          parsed = { keywords: [], rationale: "Could not parse AI response." };
        }
      }

      return NextResponse.json({
        keywords: parsed.keywords ?? [],
        rationale: parsed.rationale ?? "",
      });
    }

    // ── action: research ───────────────────────────────────────────────────────
    if (body.action === "research") {
      const { keywords, website, customerId, location, language } = body;

      if (!keywords?.length) {
        return NextResponse.json(
          { error: "keywords array is required" },
          { status: 400 }
        );
      }

      // Resolve which Google Ads customer account to use
      let resolvedCustomerId = customerId ?? "";
      if (!resolvedCustomerId) {
        const accounts = await getGoogleAdsAccounts();
        const nonManager = accounts.find((a) => !a.isManager);
        if (!nonManager) {
          return NextResponse.json(
            { error: "No Google Ads account found. Connect one in Settings." },
            { status: 400 }
          );
        }
        resolvedCustomerId = nonManager.id;
      }

      const locationIds = location ? [location] : ["2826"]; // 2826 = United Kingdom
      const languageCode = language ?? "languageConstants/1000"; // 1000 = English

      const ideas = await generateKeywordIdeas(
        resolvedCustomerId,
        keywords,
        website ?? "",
        locationIds,
        languageCode,
        100
      );

      return NextResponse.json({ ideas, customerId: resolvedCustomerId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[keyword-planner]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
