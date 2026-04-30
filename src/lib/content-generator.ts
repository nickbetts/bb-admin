/**
 * Content Generator — core library.
 *
 * Exports three main functions:
 *   generateIdeas()    — Claude Opus + web_search + SemRush → 5 ideas per content type
 *   generateContent()  — Claude Opus → full copy per idea (per-type word-count targets)
 *   buildHtmlDeliverable() — Styled HTML string for download
 *
 * Human tone principles baked into every system prompt:
 *   • British English throughout
 *   • No AI clichés or buzzword padding
 *   • Structured, purposeful writing only
 */

import { getAnthropicClient } from "@/lib/anthropic-client";
import { jsonrepair } from "jsonrepair";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentType = "blog" | "whitepaper" | "case_study" | "social";

export type ContentIntent =
  | "awareness"
  | "informational"
  | "commercial"
  | "transactional"
  | "decision";

export interface KeywordItem {
  keyword: string;
  volume?: number;
  approved: boolean;
}

export interface ContentIdea {
  id: string;
  type: ContentType;
  title: string;
  summary: string;
  angle: string;
  targetAudience: string;
  intent: ContentIntent;
  primaryKeyword: KeywordItem;
  secondaryKeywords: KeywordItem[];
  longTailKeywords: KeywordItem[];
  selected: boolean;
}

export interface SocialVariations {
  linkedin: string;
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
}

export interface GeneratedContent {
  ideaId: string;
  type: ContentType;
  title: string;
  content: string;
  wordCount: number;
  titleTag?: string;
  metaDescription?: string;
  socialVariations?: SocialVariations;
  generatedAt: string;
}

export interface SemRushContext {
  domain?: string;
  organicKeywords?: number;
  organicTraffic?: number;
  topKeywords?: { keyword: string; searchVolume: number; position: number }[];
}

export interface CompetitorContext {
  domain: string;
  commonKeywords?: number;
  pageContext?: {
    h1?: string;
    description?: string;
    headings?: string[];
    ctaTexts?: string[];
  };
}

// ─── Prohibited phrases ───────────────────────────────────────────────────────

const PROHIBITED_PHRASES = `
PROHIBITED PHRASES AND PATTERNS — never use these:
- "In today's fast-paced world"
- "In today's digital landscape"
- "Delve into" / "delving into"
- "Leverage" / "leveraging" (use "use", "apply", "make the most of" instead)
- "Transformative" / "transformation" (unless referring to a literal, measurable change)
- "Game-changer" / "game-changing"
- "It's worth noting that"
- "In conclusion," / "To conclude,"
- "In summary,"
- "Unlock" / "unlocking potential"
- "Dive deep" / "deep dive"
- "Cutting-edge"
- "State-of-the-art"
- "Synergy" / "synergistic"
- "Paradigm shift"
- "Empower" / "empowering"
- "Holistic approach"
- "Seamless" / "seamlessly" (unless literal)
- "At the end of the day"
- "Needless to say"
- "It goes without saying"
- "Moving the needle"
- "Circle back"
- "Touch base"
- "Low-hanging fruit"
- "Boilerplate"
- "Robust solution"
- "Actionable insights"
- "Dynamic" (as an adjective for anything non-technical)
- "Innovative" / "innovation" (unless genuinely novel)
- "Thought leader" / "thought leadership"
- "Best-in-class"
- Starting sentences with "Additionally," or "Furthermore,"
- Ending with a "call to action" paragraph that sounds like an advert
`.trim();

const HUMAN_TONE_INSTRUCTION = `
WRITING STYLE REQUIREMENTS:
- Write like an experienced human professional, not an AI assistant
- Use clear, direct sentences. Vary sentence length naturally
- Make arguments with evidence and specifics, not vague claims
- Use British English spellings (e.g. optimise, colour, behaviour, centre, licence)
- Contractions are fine where they feel natural (it's, you'll, we've)
- Avoid passive voice where active is clearer
- Do not pad word count — every sentence must earn its place
- Never start a section with a rhetorical question as a gimmick
- Specific numbers and real-world examples are always better than generalisations
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonSafely<T>(text: string): T | null {
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(jsonrepair(cleaned)) as T;
  } catch {
    return null;
  }
}

function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

// ─── generateIdeas ────────────────────────────────────────────────────────────

export async function generateIdeas(params: {
  brief: string;
  contentTypes: ContentType[];
  semrushContext?: SemRushContext;
  competitors?: CompetitorContext[];
  clientName: string;
  clientWebsite?: string;
  clientInstructions?: string;
}): Promise<ContentIdea[]> {
  const anthropic = await getAnthropicClient();

  const { brief, contentTypes, semrushContext, competitors, clientName, clientWebsite, clientInstructions } = params;

  const semrushSummary = semrushContext
    ? `
SEMrush data for ${semrushContext.domain ?? clientWebsite ?? "the client's domain"}:
- Organic keywords ranking: ${semrushContext.organicKeywords ?? "unknown"}
- Monthly organic traffic estimate: ${semrushContext.organicTraffic ?? "unknown"}
- Top ranking keywords: ${
        semrushContext.topKeywords?.slice(0, 20)
          .map((k) => `"${k.keyword}" (vol: ${k.searchVolume}, pos: ${k.position})`)
          .join(", ") ?? "none available"
      }
`.trim()
    : "";

  const competitorSummary =
    competitors && competitors.length > 0
      ? `
Competitor landscape:
${competitors
  .map((c) => {
    const ctx = c.pageContext;
    return `• ${c.domain} (${c.commonKeywords ?? 0} common keywords)${ctx?.h1 ? ` — H1: "${ctx.h1}"` : ""}${ctx?.description ? `\n  Description: ${ctx.description}` : ""}`;
  })
  .join("\n")}
`.trim()
      : "";

  const typesRequested = contentTypes.join(", ");

  const systemPrompt = `You are a senior content strategist with 15+ years of experience creating award-winning content for B2B and B2C brands. You combine deep SEO knowledge with editorial instincts to produce ideas that are genuinely useful, not just optimised.

${HUMAN_TONE_INSTRUCTION}

${PROHIBITED_PHRASES}

Your task: generate exactly 5 content ideas for each requested content type. Each idea must be:
- Specific and differentiated (not generic "Ultimate Guide to X")
- Grounded in a real audience need or pain point
- SEO-informed but editorially driven
- Supported by a clear primary keyword strategy

Output ONLY a valid JSON array of ContentIdea objects. No commentary, no markdown fences.`;

  const userPrompt = `Client: ${clientName}
${clientWebsite ? `Website: ${clientWebsite}` : ""}
Brief: ${brief}

Content types to generate ideas for: ${typesRequested}

${semrushSummary}

${competitorSummary}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}

Generate exactly 5 ideas per content type listed above.

Return a JSON array where each object matches this exact shape:
{
  "id": "unique-slug-e.g-blog-1",
  "type": "blog" | "whitepaper" | "case_study" | "social",
  "title": "The specific content title",
  "summary": "2-3 sentences explaining what this piece covers and why it matters to the audience",
  "angle": "The editorial angle or hook that makes this piece distinctive",
  "targetAudience": "Who this is written for (specific role/persona, not just 'businesses')",
  "intent": "awareness" | "informational" | "commercial" | "transactional" | "decision",
  "primaryKeyword": {
    "keyword": "the main target keyword phrase",
    "volume": 1200,
    "approved": true
  },
  "secondaryKeywords": [
    { "keyword": "related keyword", "volume": 480, "approved": true },
    { "keyword": "another related keyword", "volume": 320, "approved": true },
    { "keyword": "third related keyword", "volume": 210, "approved": true }
  ],
  "longTailKeywords": [
    { "keyword": "long-tail variant one", "volume": 90, "approved": true },
    { "keyword": "long-tail variant two", "volume": 60, "approved": true },
    { "keyword": "long-tail variant three", "volume": 40, "approved": true },
    { "keyword": "long-tail variant four", "volume": 30, "approved": true },
    { "keyword": "long-tail variant five", "volume": 20, "approved": true }
  ],
  "selected": false
}

Rules:
- Populate volume fields using the SemRush data provided where possible. Where not available, use your best estimate based on the niche.
- Keywords must be relevant to the specific idea, not generic to the client.
- All 5 long-tail keywords should target informational or commercial intent queries a real person would type.
- For social media ideas: the title should describe the campaign concept, the summary should outline what posts would cover, and keywords should reflect the hashtag/topic strategy.
- For case studies: the title should follow "How [Company Type] achieved [Result]" format without naming real companies unless the client provides them.`;

  const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
    {
      type: "web_search_20250305" as const,
      name: "web_search",
      max_uses: 3,
    } as Parameters<typeof anthropic.messages.create>[0]["tools"][number],
  ];

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8000,
    system: systemPrompt,
    tools,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract the text block — may be preceded by tool_use blocks
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from idea generation");
  }

  const ideas = parseJsonSafely<ContentIdea[]>(textBlock.text);
  if (!ideas || !Array.isArray(ideas)) {
    throw new Error("Failed to parse ideas JSON from model response");
  }

  return ideas;
}

// ─── generateContent ──────────────────────────────────────────────────────────

async function generateBlog(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ content: string; titleTag: string; metaDescription: string }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  const systemPrompt = `You are an experienced content writer and SEO specialist. You write long-form blog articles that rank in Google and are genuinely useful to readers.

${HUMAN_TONE_INSTRUCTION}

${PROHIBITED_PHRASES}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  const userPrompt = `Write a complete, publication-ready blog article for the following:

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}
Intent: ${idea.intent}

Primary keyword (must appear in H1, first paragraph, and at least two H2s): ${approvedKeywords.primary}
Secondary keywords (weave in naturally): ${approvedKeywords.secondary.join(", ")}
Long-tail keywords (include where relevant): ${approvedKeywords.longTail.join(", ")}

Requirements:
- Length: 1,000–1,500 words
- Structure: H1 title → introduction (no "In today's..." opening) → 4–6 H2 sections → conclusion (no "In conclusion,")
- Output the article in clean HTML: use <h1>, <h2>, <p>, <ul>/<ol>/<li> only
- Include the primary keyword in the H1 naturally (not forced)
- The introduction must open with a specific insight, statistic, scenario or question that a real reader would find immediately useful — not a vague scene-setter
- Each H2 section should have 2–4 paragraphs
- Include at least one bulleted or numbered list
- Final section: a specific, practical next step — not a generic "get in touch" paragraph

After the article HTML, output a JSON object on its own line (no markdown):
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)"}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";

  // Split article from trailing JSON
  const jsonLineMatch = text.match(/\n(\{[^\n]+\})\s*$/);
  const articleHtml = jsonLineMatch ? text.slice(0, text.lastIndexOf(jsonLineMatch[0])).trim() : text.trim();
  const metaJson = jsonLineMatch ? parseJsonSafely<{ titleTag: string; metaDescription: string }>(jsonLineMatch[1]) : null;

  return {
    content: articleHtml,
    titleTag: metaJson?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaJson?.metaDescription ?? idea.summary.slice(0, 160),
  };
}

async function generateWhitepaper(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ content: string; titleTag: string; metaDescription: string }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  const systemPrompt = `You are a senior analyst and business writer specialising in authoritative whitepapers and research reports. Your writing is precise, evidence-based, and read by senior decision-makers.

${HUMAN_TONE_INSTRUCTION}

${PROHIBITED_PHRASES}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  // Generate in two parts to handle length
  const part1Prompt = `Write the first half of a comprehensive whitepaper:

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}

Primary keyword: ${approvedKeywords.primary}
Secondary keywords: ${approvedKeywords.secondary.join(", ")}

Write the following sections in clean HTML (<h1>, <h2>, <h3>, <p>, <ul>/<ol>/<li>):
1. Executive Summary (150–200 words — the most important section; decision-makers read only this)
2. Introduction / The Challenge (250–350 words — define the problem with specifics)
3. Section 1: [First major theme from the brief] (300–400 words)
4. Section 2: [Second major theme] (300–400 words)

Stop after Section 2. Do not write a conclusion yet.`;

  const part2Prompt = `Continue the whitepaper for "${idea.title}". Write the following sections in clean HTML:
5. Section 3: [Third major theme] (300–400 words)
6. Key Findings / What the Data Shows (200–300 words — use a numbered list of 5–7 findings)
7. Recommendations (250–350 words — 4–6 specific, actionable recommendations as a numbered list)
8. About This Report / Methodology (100–150 words)

End with a JSON object on its own line:
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)"}`;

  const [part1Res, part2Res] = await Promise.all([
    anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: part1Prompt }],
    }),
    anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: part2Prompt }],
    }),
  ]);

  const text1 = part1Res.content[0]?.type === "text" ? part1Res.content[0].text.trim() : "";
  const text2 = part2Res.content[0]?.type === "text" ? part2Res.content[0].text.trim() : "";

  const jsonLineMatch = text2.match(/\n(\{[^\n]+\})\s*$/);
  const body2 = jsonLineMatch ? text2.slice(0, text2.lastIndexOf(jsonLineMatch[0])).trim() : text2;
  const metaJson = jsonLineMatch ? parseJsonSafely<{ titleTag: string; metaDescription: string }>(jsonLineMatch[1]) : null;

  return {
    content: `${text1}\n${body2}`,
    titleTag: metaJson?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaJson?.metaDescription ?? idea.summary.slice(0, 160),
  };
}

async function generateCaseStudy(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ content: string; titleTag: string; metaDescription: string }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  const systemPrompt = `You are a B2B content writer specialising in compelling case studies that convert sceptical prospects into buyers.

${HUMAN_TONE_INSTRUCTION}

${PROHIBITED_PHRASES}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  const userPrompt = `Write a complete, publication-ready case study:

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}

Primary keyword: ${approvedKeywords.primary}
Secondary keywords: ${approvedKeywords.secondary.join(", ")}

Structure (clean HTML — <h1>, <h2>, <p>, <ul>, <blockquote> for pull quotes):

1. <h1> — The title (include the primary keyword naturally)
2. Results Snapshot (a short <ul> of 3–5 headline metrics at the top — e.g. "47% reduction in cost per lead")
3. <h2>The Challenge</h2> — 200–250 words. Describe the client's situation and the specific problem they needed to solve. Use "the client" not a company name unless provided.
4. <h2>The Approach</h2> — 250–350 words. What was done, in what order, and why those specific choices were made. Be specific about tactics and reasoning.
5. <h2>The Results</h2> — 200–300 words. Quantified outcomes. If specific numbers aren't available, describe the qualitative shift clearly. Include a pull-quote (<blockquote>) from a client stakeholder (write a realistic, non-sycophantic quote).
6. <h2>Key Takeaways</h2> — 3–5 bullet points. Practical lessons a similar organisation could apply.

Length: 800–1,200 words total.

After the HTML, output a JSON object on its own line:
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)"}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 3500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonLineMatch = text.match(/\n(\{[^\n]+\})\s*$/);
  const articleHtml = jsonLineMatch ? text.slice(0, text.lastIndexOf(jsonLineMatch[0])).trim() : text.trim();
  const metaJson = jsonLineMatch ? parseJsonSafely<{ titleTag: string; metaDescription: string }>(jsonLineMatch[1]) : null;

  return {
    content: articleHtml,
    titleTag: metaJson?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaJson?.metaDescription ?? idea.summary.slice(0, 160),
  };
}

async function generateSocial(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<SocialVariations> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  const systemPrompt = `You are an expert social media copywriter who writes platform-native content that earns genuine engagement.

${HUMAN_TONE_INSTRUCTION}

${PROHIBITED_PHRASES}

Platform guidelines:
- LinkedIn: Professional but human. 150–300 words. Line breaks every 2–3 sentences. End with a thought-provoking question or a specific, practical tip — NOT a "drop a comment below" plea. Hashtags at the end: 3–5 relevant ones.
- Instagram: Visual-first. 80–150 words. Short punchy sentences. Uses line breaks generously. 8–15 hashtags at the end.
- Facebook: Conversational. 100–200 words. Slightly casual. Encourages sharing or discussion without begging for it.
- X (Twitter): Max 280 characters. Direct, punchy, specific. One clear idea. Optional single hashtag.
- TikTok: Script/caption hybrid. 60–120 words. High energy, specific hook in the first line, clear structure (hook → point → takeaway). Optional trending hashtags.

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  const userPrompt = `Write social media copy for this campaign concept:

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}
Topic keywords: ${[approvedKeywords.primary, ...approvedKeywords.secondary].join(", ")}

Return ONLY a valid JSON object (no markdown, no commentary):
{
  "linkedin": "...",
  "instagram": "...",
  "facebook": "...",
  "twitter": "...",
  "tiktok": "..."
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const variations = parseJsonSafely<SocialVariations>(text);

  if (!variations) {
    throw new Error("Failed to parse social media variations from model response");
  }

  return variations;
}

export async function generateContent(
  idea: ContentIdea,
  clientInstructions: string = "",
): Promise<GeneratedContent> {
  const anthropic = await getAnthropicClient();

  const approvedKeywords = {
    primary: idea.primaryKeyword.approved ? idea.primaryKeyword.keyword : "",
    secondary: idea.secondaryKeywords.filter((k) => k.approved).map((k) => k.keyword),
    longTail: idea.longTailKeywords.filter((k) => k.approved).map((k) => k.keyword),
  };

  let content = "";
  let titleTag: string | undefined;
  let metaDescription: string | undefined;
  let socialVariations: SocialVariations | undefined;

  if (idea.type === "blog") {
    const result = await generateBlog({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
  } else if (idea.type === "whitepaper") {
    const result = await generateWhitepaper({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
  } else if (idea.type === "case_study") {
    const result = await generateCaseStudy({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
  } else if (idea.type === "social") {
    socialVariations = await generateSocial({ idea, approvedKeywords, clientInstructions, anthropic });
    content = Object.values(socialVariations).join("\n\n---\n\n");
  }

  return {
    ideaId: idea.id,
    type: idea.type,
    title: idea.title,
    content,
    wordCount: countWords(content),
    titleTag,
    metaDescription,
    socialVariations,
    generatedAt: new Date().toISOString(),
  };
}

// ─── buildHtmlDeliverable ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog Article",
  whitepaper: "Whitepaper",
  case_study: "Case Study",
  social: "Social Media Copy",
};

const TYPE_COLOURS: Record<ContentType, string> = {
  blog: "#2563eb",
  whitepaper: "#7c3aed",
  case_study: "#059669",
  social: "#ea580c",
};

export function buildHtmlDeliverable(params: {
  items: GeneratedContent[];
  clientName: string;
  brief: string;
}): string {
  const { items, clientName, brief } = params;

  const tocItems = items
    .map(
      (item, i) =>
        `<li><a href="#piece-${i + 1}" style="color:${TYPE_COLOURS[item.type]};text-decoration:none;">${TYPE_LABELS[item.type]}: ${item.title}</a></li>`,
    )
    .join("\n");

  const contentSections = items
    .map((item, i) => {
      const colour = TYPE_COLOURS[item.type];
      const label = TYPE_LABELS[item.type];

      if (item.type === "social" && item.socialVariations) {
        const platforms = [
          { key: "linkedin" as const, name: "LinkedIn" },
          { key: "instagram" as const, name: "Instagram" },
          { key: "facebook" as const, name: "Facebook" },
          { key: "twitter" as const, name: "X (Twitter)" },
          { key: "tiktok" as const, name: "TikTok" },
        ];

        const platformBlocks = platforms
          .map(
            (p) => `
            <div style="margin-bottom:24px;padding:20px;background:#f8fafc;border-left:4px solid ${colour};border-radius:0 8px 8px 0;">
              <h4 style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">${p.name}</h4>
              <p style="margin:0;white-space:pre-wrap;line-height:1.7;color:#1e293b;">${item.socialVariations![p.key]}</p>
            </div>`,
          )
          .join("");

        return `
        <section id="piece-${i + 1}" style="margin-bottom:64px;padding-bottom:64px;border-bottom:1px solid #e2e8f0;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <span style="background:${colour};color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.08em;">${label}</span>
            <span style="font-size:12px;color:#94a3b8;">${item.wordCount} words total</span>
          </div>
          <h2 style="margin:0 0 32px;font-size:26px;font-weight:700;color:#0f172a;line-height:1.3;">${item.title}</h2>
          ${platformBlocks}
        </section>`;
      }

      const seoBlock =
        item.titleTag || item.metaDescription
          ? `
          <div style="margin-bottom:32px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <h4 style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#166534;">SEO Metadata</h4>
            ${item.titleTag ? `<p style="margin:0 0 8px;font-size:14px;"><strong style="color:#166534;">Title tag:</strong> ${item.titleTag}</p>` : ""}
            ${item.metaDescription ? `<p style="margin:0;font-size:14px;"><strong style="color:#166534;">Meta description:</strong> ${item.metaDescription}</p>` : ""}
          </div>`
          : "";

      return `
      <section id="piece-${i + 1}" style="margin-bottom:64px;padding-bottom:64px;border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <span style="background:${colour};color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.08em;">${label}</span>
          <span style="font-size:12px;color:#94a3b8;">${item.wordCount} words</span>
        </div>
        ${seoBlock}
        <div style="font-size:16px;line-height:1.8;color:#1e293b;max-width:720px;">
          ${item.content}
        </div>
      </section>`;
    })
    .join("\n");

  const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Pack — ${clientName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #fff; color: #1e293b; }
    h1, h2, h3, h4 { line-height: 1.3; }
    p { margin: 0 0 1em; }
    ul, ol { margin: 0 0 1em; padding-left: 1.5em; }
    li { margin-bottom: .4em; }
    blockquote { margin: 1.5em 0; padding: 1em 1.5em; border-left: 4px solid #cbd5e1; background: #f8fafc; font-style: italic; color: #475569; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:60px 40px;">
    <!-- Cover -->
    <div style="margin-bottom:60px;padding-bottom:40px;border-bottom:3px solid #0f172a;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#64748b;">Content Pack</p>
      <h1 style="margin:0 0 16px;font-size:36px;font-weight:800;color:#0f172a;">${clientName}</h1>
      <p style="margin:0 0 24px;font-size:16px;color:#475569;max-width:600px;">${brief}</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;">Generated ${now} · ${items.length} piece${items.length !== 1 ? "s" : ""}</p>
    </div>

    <!-- Table of contents -->
    <div style="margin-bottom:60px;padding:28px;background:#f8fafc;border-radius:12px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">Contents</h2>
      <ol style="margin:0;padding-left:1.25em;line-height:2;">
        ${tocItems}
      </ol>
    </div>

    <!-- Content pieces -->
    ${contentSections}

    <!-- Footer -->
    <div style="text-align:center;padding-top:40px;font-size:12px;color:#94a3b8;">
      Generated by i3media Content Generator
    </div>
  </div>
</body>
</html>`;
}
