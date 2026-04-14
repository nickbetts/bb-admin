import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

interface AudienceData {
  ga4?: {
    ageGroups?: Record<string, number>;
    genders?: Record<string, number>;
    countries?: Record<string, number>;
  };
  meta?: {
    ageGender?: Array<{
      age: string;
      gender: string;
      impressions: number;
      clicks: number;
      spend: number;
    }>;
  };
  tiktok?: {
    demographics?: Array<{
      gender: string;
      ageRange: string;
      impressions: number;
      clicks: number;
      spend: number;
    }>;
  };
  linkedin?: {
    seniority?: Array<{
      label: string;
      impressions: number;
      clicks: number;
      spend: number;
    }>;
    industry?: Array<{
      label: string;
      impressions: number;
      clicks: number;
      spend: number;
    }>;
  };
  youtube?: {
    demographics?: Array<{
      ageGroup: string;
      gender: string;
      viewerPercentage: number;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, audienceData } = body as {
      clientId?: string;
      audienceData?: AudienceData;
    };

    if (!clientId || !audienceData) {
      return NextResponse.json(
        { error: "clientId and audienceData are required" },
        { status: 400 }
      );
    }

    // Determine which platforms provided data
    const dataSources: string[] = [];
    if (audienceData.ga4) dataSources.push("ga4");
    if (audienceData.meta) dataSources.push("meta");
    if (audienceData.tiktok) dataSources.push("tiktok");
    if (audienceData.linkedin) dataSources.push("linkedin");
    if (audienceData.youtube) dataSources.push("youtube");

    if (dataSources.length === 0) {
      return NextResponse.json(
        { error: "At least one platform's audience data must be provided" },
        { status: 400 }
      );
    }

    const openai = await getOpenAiClient();

    const systemPrompt = `You are a senior digital marketing analyst at a UK agency. You analyse audience demographic data from multiple advertising and analytics platforms to build a unified audience profile.

You must respond with ONLY valid JSON (no markdown, no code fences). Use British English throughout.

Return this exact JSON structure:
{
  "profile": {
    "primaryAgeRange": "<e.g. 25-44>",
    "genderSplit": { "male": <number 0-100>, "female": <number 0-100>, "other": <number 0-100> },
    "topLocations": ["<country1>", "<country2>"],
    "b2bInsights": {
      "topSeniorities": ["<seniority1>", "<seniority2>"],
      "topIndustries": ["<industry1>", "<industry2>"]
    },
    "personas": [
      {
        "name": "<persona name>",
        "description": "<1-2 sentence description>",
        "platforms": ["<platform1>", "<platform2>"]
      }
    ]
  },
  "narrative": "<2-3 paragraph narrative summary of the unified audience profile, written in British English>"
}

Rules:
- Identify the dominant age groups by weighting across all platforms
- Calculate gender splits as percentages summing to 100
- If LinkedIn data is present, surface B2B seniority and industry insights; otherwise set topSeniorities and topIndustries to empty arrays
- Create 1-3 audience personas based on patterns across platforms
- The narrative should synthesise findings into actionable insight
- If location data is missing, set topLocations to an empty array`;

    const userPrompt = `Analyse the following cross-platform audience data and build a unified audience profile.

Data sources available: ${dataSources.join(", ")}

${JSON.stringify(audienceData, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_completion_tokens: 1500,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Attempt to extract JSON from markdown fences
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return NextResponse.json({
      profile: parsed.profile,
      narrative: parsed.narrative,
      dataSources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Unified audience error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
