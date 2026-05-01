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
  schemaJson?: string;
  sourceCitations?: SourceCitation[];
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

export interface SourceCitation {
  title: string;
  url: string;
  domain?: string;
  publishedDate?: string;
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

PUNCTUATION — never use these in output copy:
- Em dashes (\u2014): replace with a comma, colon, semicolon, parentheses, or restructure the sentence
- Ellipsis (...) for dramatic effect or padding: use a full stop and a new sentence instead
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

const NO_FABRICATION_INSTRUCTION = `
STATISTICS AND DATA — CRITICAL:
- Never invent, estimate, or fabricate statistics, percentages, figures, study results, or research findings
- Only state a statistic if you have been given a verified source for it in this session
- Every statistic in the body text must be followed immediately by its inline citation [N]
- If you have no verified figure to support a point, make the argument qualitatively with clear reasoning — do not fill the gap with a made-up number
- Do not write vague attributions like "studies show" or "research suggests" without a specific, named source
- Organisation names, report titles, and publication names cited as sources must be real and verifiable
`.trim();

const VALUE_FIRST_INSTRUCTION = `
READER VALUE — NON-NEGOTIABLE:
- Every piece must leave the reader materially better informed than before they read it
- Include at least one specific insight, framework, calculation, or worked example the reader can apply immediately
- Do not bury the useful content behind build-up — get to the point
- Write as if the reader is a smart professional with limited time and no patience for filler
- SEO keywords support good writing; they never override clarity or usefulness
- Practical, specific advice is always more valuable than general observations
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

/**
 * Extract <meta-json>...</meta-json> block from generated text.
 * Falls back to trailing single-line JSON for backwards compatibility.
 */
function extractMetaJson<T>(text: string): { html: string; meta: T | null } {
  // 1. Complete <meta-json>...</meta-json> block (preferred format)
  const tagMatch = /<meta-json>([\s\S]*?)<\/meta-json>/i.exec(text);
  if (tagMatch) {
    const before = text.slice(0, tagMatch.index).trim();
    const after = text.slice(tagMatch.index + tagMatch[0].length).trim();
    return { html: (before + (after ? "\n" + after : "")).trim(), meta: parseJsonSafely<T>(tagMatch[1].trim()) };
  }
  // 2. Unclosed <meta-json> — response truncated before closing tag
  const openTagMatch = /<meta-json>([\s\S]*)$/i.exec(text);
  if (openTagMatch) {
    return { html: text.slice(0, openTagMatch.index).trim(), meta: parseJsonSafely<T>(openTagMatch[1].trim()) };
  }
  // 3. Complete triple-backtick code block containing JSON at end
  const codeBlockMatch = /\n?```(?:json)?\s*\n?(\{[\s\S]*?\})\s*\n?```\s*$/i.exec(text);
  if (codeBlockMatch) {
    return { html: text.slice(0, codeBlockMatch.index).trim(), meta: parseJsonSafely<T>(codeBlockMatch[1]) };
  }
  // 4. Unclosed triple-backtick block — response truncated mid-JSON
  const openCodeMatch = /\n```(?:json)?\s*\n?(\{[\s\S]*)$/i.exec(text);
  if (openCodeMatch) {
    return { html: text.slice(0, openCodeMatch.index).trim(), meta: parseJsonSafely<T>(openCodeMatch[1].trim()) };
  }
  // 5. Legacy: trailing single-line JSON
  const legacy = /\n(\{[^\n]+\})\s*$/.exec(text);
  if (legacy) {
    return {
      html: text.slice(0, text.lastIndexOf(legacy[0])).trim(),
      meta: parseJsonSafely<T>(legacy[1]),
    };
  }
  return { html: text.trim(), meta: null };
}

/**
 * Use web_search to find real, citable statistics on a topic before writing.
 * Returns a formatted stats context string and a sources list.
 */
async function researchStats(params: {
  topic: string;
  angle: string;
  audience: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ statsContext: string; sources: SourceCitation[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = [{ type: "web_search_20250305" as const, name: "web_search", max_uses: 4 }] as any;

  try {
    const response = await params.anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      tools,
      messages: [{
        role: "user",
        content: `Search for 4-6 real, current statistics or data points to support an article about: "${params.topic}"
Angle: ${params.angle}
Target audience: ${params.audience}

Requirements:
- Only include statistics you have found and verified via web search
- Each stat must have a real, accessible source URL
- Prefer authoritative sources: government bodies, academic institutions, established research firms, major industry associations
- Statistics should be recent (ideally within the last 3 years)
- Do NOT invent, estimate, or extrapolate figures

Return ONLY a valid JSON object in this exact format — no commentary:
{"statsContext":"Bullet-point summary of verified statistics, each with inline citation [N]. Format: \\u2022 [stat] [N]","sources":[{"n":1,"title":"Source page title","url":"https://...","domain":"organisation.com","publishedDate":"2024"}]}`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";
    const parsed = parseJsonSafely<{
      statsContext: string;
      sources: Array<{ n: number; title: string; url: string; domain?: string; publishedDate?: string }>;
    }>(text);

    if (!parsed) return { statsContext: "", sources: [] };

    return {
      statsContext: parsed.statsContext ?? "",
      sources: (parsed.sources ?? []).map(({ title, url, domain, publishedDate }) => ({ title, url, domain, publishedDate })),
    };
  } catch {
    // Research failure should not block generation
    return { statsContext: "", sources: [] };
  }
}

/**
 * Second-pass editorial review by Claude Opus.
 * Strips leaked JSON/metadata/code-fence artefacts, fixes truncated endings,
 * and returns clean publication-ready HTML.
 */
async function runCleanupPass(params: {
  html: string;
  type: Exclude<ContentType, "social">;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<string> {
  const { html, type, anthropic } = params;

  // Pre-strip the most obvious artifacts synchronously before the API call
  const preStripped = html
    .replace(/```(?:json|html)?[\s\S]*?```/gi, "")      // any code fence blocks
    .replace(/<meta-json>[\s\S]*?(?:<\/meta-json>|$)/gi, "") // meta-json tags (open or closed)
    .replace(/\n```(?:json|html)?\s*$/, "")              // trailing unclosed code fence
    .trim();

  const typeLabel = type === "blog" ? "blog article" : type === "whitepaper" ? "whitepaper" : "case study";

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 5000,
    system: `You are a senior editor performing a final quality pass on a ${typeLabel}. You output only clean, publication-ready HTML.`,
    messages: [{
      role: "user",
      content: `Review this ${typeLabel} HTML and return a clean, final version. Return ONLY the HTML — no commentary, no code fences, no JSON.

Rules:
- Remove any JSON objects, schema markup, code fences, or technical metadata that has leaked into the body text
- If the piece ends abruptly due to truncation, write a brief natural closing sentence or short paragraph — keep it concise and on-topic
- Ensure all HTML tags are properly opened and closed
- Keep all inline citations like [1], [2] exactly as written
- Do NOT add new statistics, facts, or claims
- Do NOT restructure or substantially rewrite sections

${preStripped}`,
    }],
  });

  const result = response.content[0]?.type === "text" ? response.content[0].text.trim() : preStripped;
  // Strip any code fences the model might wrap its response in
  return result.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "").trim();
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

  const tools = [
    {
      type: "web_search_20250305" as const,
      name: "web_search",
      max_uses: 5,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
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
}): Promise<{ content: string; titleTag: string; metaDescription: string; schemaJson?: string; sourceCitations?: SourceCitation[] }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  // Step 1: Research real, citable statistics on the topic before writing
  const research = await researchStats({ topic: idea.title, angle: idea.angle, audience: idea.targetAudience, anthropic });

  const systemPrompt = `You are an experienced content writer and SEO specialist. You write long-form blog articles that rank in Google and genuinely help readers.

${HUMAN_TONE_INSTRUCTION}

${VALUE_FIRST_INSTRUCTION}

${NO_FABRICATION_INSTRUCTION}

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

${research.statsContext ? `VERIFIED STATISTICS (use these — cite inline as [1], [2] etc.):\n${research.statsContext}\n` : ""}
Requirements:
- Length: 1,000–1,500 words
- Structure: H1 title → introduction (no "In today's..." opening) → 4–6 H2 sections → conclusion (no "In conclusion,")
- Output the article in clean HTML: use <h1>, <h2>, <p>, <ul>/<ol>/<li> only
- Include the primary keyword in the H1 naturally (not forced)
- The introduction must open with a specific verified insight or statistic [N] that a real reader would find immediately useful
- Use the verified statistics above and cite them inline with [N] notation
- Never state a statistic without a citation — if no verified figure exists for a point, argue qualitatively
- Each H2 section should have 2–4 paragraphs
- Include at least one bulleted or numbered list
- Final section: a specific, practical next step — not a generic "get in touch" paragraph

After the article HTML, output the metadata in exactly this format:
<meta-json>
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)","schema":{"@context":"https://schema.org","@type":"Article","headline":"exact H1 title","description":"exact meta description","keywords":"primary keyword, secondary keywords comma-separated"}}
</meta-json>`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const { html: rawHtml, meta: metaObj } = extractMetaJson<{ titleTag: string; metaDescription: string; schema?: Record<string, unknown> }>(text);
  const articleHtml = await runCleanupPass({ html: rawHtml, type: "blog", anthropic });

  return {
    content: articleHtml,
    titleTag: metaObj?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaObj?.metaDescription ?? idea.summary.slice(0, 160),
    schemaJson: metaObj?.schema ? JSON.stringify(metaObj.schema) : undefined,
    sourceCitations: research.sources.length > 0 ? research.sources : undefined,
  };
}

async function generateWhitepaper(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ content: string; titleTag: string; metaDescription: string; schemaJson?: string; sourceCitations?: SourceCitation[] }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  // Step 1: Research real, citable statistics before writing
  const research = await researchStats({ topic: idea.title, angle: idea.angle, audience: idea.targetAudience, anthropic });

  const systemPrompt = `You are a senior analyst and business writer specialising in authoritative whitepapers and research reports. Your writing is precise, evidence-based, and read by senior decision-makers.

${HUMAN_TONE_INSTRUCTION}

${VALUE_FIRST_INSTRUCTION}

${NO_FABRICATION_INSTRUCTION}

${PROHIBITED_PHRASES}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  const statsBlock = research.statsContext
    ? `VERIFIED STATISTICS (use these — cite inline as [1], [2] etc.):\n${research.statsContext}\n`
    : "";

  // Generate in two parallel parts to reliably hit the target length
  const part1Prompt = `Write the first half of a comprehensive whitepaper:

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}

Primary keyword: ${approvedKeywords.primary}
Secondary keywords: ${approvedKeywords.secondary.join(", ")}

${statsBlock}
Write the following sections in clean HTML (<h1>, <h2>, <h3>, <p>, <ul>/<ol>/<li>):
1. Executive Summary (150–200 words — decision-makers read only this; make every word count)
2. Introduction / The Challenge (250–350 words — define the problem with specific, cited evidence)
3. Section 1: [First major theme from the brief] (300–400 words — use cited statistics where available)
4. Section 2: [Second major theme] (300–400 words — use cited statistics where available)

Stop after Section 2. Do not write a conclusion yet.
Do not cite a statistic unless it appears in the verified statistics block above.`;

  const part2Prompt = `Continue the whitepaper for "${idea.title}". Write in clean HTML (<h2>, <h3>, <p>, <ul>/<ol>/<li>):

${statsBlock}
5. Section 3: [Third major theme] (300–400 words)
6. Key Findings / What the Data Shows (200–300 words — 5–7 numbered findings; only include findings that can be backed by the verified statistics above or qualitative analysis)
7. Recommendations (250–350 words — 4–6 specific, actionable recommendations as a numbered list; each must be concrete enough to act on)
8. About This Report / Methodology (100–150 words)

After the HTML, output the metadata in exactly this format:
<meta-json>
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)","schema":{"@context":"https://schema.org","@type":"TechArticle","headline":"exact H1 title","description":"exact meta description","keywords":"primary keyword, secondary keywords comma-separated"}}
</meta-json>`;

  const [part1Res, part2Res] = await Promise.all([
    anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: part1Prompt }],
    }),
    anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: part2Prompt }],
    }),
  ]);

  const text1 = part1Res.content[0]?.type === "text" ? part1Res.content[0].text.trim() : "";
  const text2 = part2Res.content[0]?.type === "text" ? part2Res.content[0].text.trim() : "";

  const { html: body2, meta: metaObj } = extractMetaJson<{ titleTag: string; metaDescription: string; schema?: Record<string, unknown> }>(text2);
  const whitepaperHtml = await runCleanupPass({ html: `${text1}\n${body2}`, type: "whitepaper", anthropic });

  return {
    content: whitepaperHtml,
    titleTag: metaObj?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaObj?.metaDescription ?? idea.summary.slice(0, 160),
    schemaJson: metaObj?.schema ? JSON.stringify(metaObj.schema) : undefined,
    sourceCitations: research.sources.length > 0 ? research.sources : undefined,
  };
}

async function generateCaseStudy(params: {
  idea: ContentIdea;
  approvedKeywords: { primary: string; secondary: string[]; longTail: string[] };
  clientInstructions: string;
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
}): Promise<{ content: string; titleTag: string; metaDescription: string; schemaJson?: string }> {
  const { idea, approvedKeywords, clientInstructions, anthropic } = params;

  const systemPrompt = `You are a B2B content writer specialising in compelling case studies that convert sceptical prospects into buyers.

${HUMAN_TONE_INSTRUCTION}

${VALUE_FIRST_INSTRUCTION}

${PROHIBITED_PHRASES}

${clientInstructions ? `Additional client instructions:\n${clientInstructions}` : ""}`;

  // Generate in two parallel parts to reliably hit the 800–1,200 word target
  const part1Prompt = `Write the first half of a case study in clean HTML (<h1>, <h2>, <p>, <ul>):

Title: ${idea.title}
Summary: ${idea.summary}
Angle: ${idea.angle}
Target audience: ${idea.targetAudience}

Primary keyword: ${approvedKeywords.primary}
Secondary keywords: ${approvedKeywords.secondary.join(", ")}

Write these sections only:
1. <h1> — The title (include the primary keyword naturally)
2. Results Snapshot — a short <ul> of 3–5 headline metrics (e.g. "47% reduction in cost per lead")
3. <h2>The Challenge</h2> — 200–250 words. Describe the client's situation and the specific problem. Use "the client" not a company name unless provided.
4. <h2>The Approach</h2> — 250–350 words. What was done, in what order, and why. Be specific about tactics and reasoning.

Stop after The Approach. Do not write the results or conclusion yet.`;

  const part2Prompt = `Continue the case study for "${idea.title}". Write in clean HTML (<h2>, <p>, <ul>, <blockquote>):

5. <h2>The Results</h2> — 200–300 words of quantified outcomes. If specific numbers aren't available, describe the qualitative shift clearly. Include a pull-quote (<blockquote>) from a client stakeholder — write a realistic, non-sycophantic quote.
6. <h2>Key Takeaways</h2> — 3–5 bullet points with practical lessons a similar organisation could apply.

After the HTML, output the metadata in exactly this format:
<meta-json>
{"titleTag":"...(max 60 chars)","metaDescription":"...(max 160 chars)","schema":{"@context":"https://schema.org","@type":"Article","headline":"exact H1 title","description":"exact meta description","keywords":"primary keyword, secondary keywords comma-separated"}}
</meta-json>`;

  const [part1Res, part2Res] = await Promise.all([
    anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: part1Prompt }],
    }),
    anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: part2Prompt }],
    }),
  ]);

  const text1 = part1Res.content[0]?.type === "text" ? part1Res.content[0].text.trim() : "";
  const text2 = part2Res.content[0]?.type === "text" ? part2Res.content[0].text.trim() : "";

  const { html: body2, meta: metaObj } = extractMetaJson<{ titleTag: string; metaDescription: string; schema?: Record<string, unknown> }>(text2);
  const caseStudyHtml = await runCleanupPass({ html: `${text1}\n${body2}`, type: "case_study", anthropic });

  return {
    content: caseStudyHtml,
    titleTag: metaObj?.titleTag ?? idea.title.slice(0, 60),
    metaDescription: metaObj?.metaDescription ?? idea.summary.slice(0, 160),
    schemaJson: metaObj?.schema ? JSON.stringify(metaObj.schema) : undefined,
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
    model: "claude-opus-4-7",
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
  let schemaJson: string | undefined;
  let sourceCitations: SourceCitation[] | undefined;
  let socialVariations: SocialVariations | undefined;

  if (idea.type === "blog") {
    const result = await generateBlog({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
    schemaJson = result.schemaJson;
    sourceCitations = result.sourceCitations;
  } else if (idea.type === "whitepaper") {
    const result = await generateWhitepaper({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
    schemaJson = result.schemaJson;
    sourceCitations = result.sourceCitations;
  } else if (idea.type === "case_study") {
    const result = await generateCaseStudy({ idea, approvedKeywords, clientInstructions, anthropic });
    content = result.content;
    titleTag = result.titleTag;
    metaDescription = result.metaDescription;
    schemaJson = result.schemaJson;
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
    schemaJson,
    sourceCitations,
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

  const schemaScripts = items
    .filter((item) => item.schemaJson && item.type !== "social")
    .map((item) => `  <script type="application/ld+json">${item.schemaJson}</script>`)
    .join("\n");

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

      const prettySchema = item.schemaJson
        ? (() => { try { return JSON.stringify(JSON.parse(item.schemaJson), null, 2); } catch { return item.schemaJson; } })()
        : "";
      const seoBlock =
        item.titleTag || item.metaDescription || item.schemaJson
          ? `
          <div style="margin-bottom:32px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <h4 style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#166534;">SEO Metadata</h4>
            ${item.titleTag ? `<p style="margin:0 0 8px;font-size:14px;"><strong style="color:#166534;">Title tag:</strong> ${item.titleTag}</p>` : ""}
            ${item.metaDescription ? `<p style="margin:0 0 8px;font-size:14px;"><strong style="color:#166534;">Meta description:</strong> ${item.metaDescription}</p>` : ""}
            ${prettySchema ? `<details style="margin-top:8px;"><summary style="font-size:13px;font-weight:600;color:#166534;cursor:pointer;">JSON-LD Schema markup</summary><pre style="margin:8px 0 0;padding:12px;background:#dcfce7;border-radius:6px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;">${prettySchema}</pre></details>` : ""}
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
        ${item.sourceCitations && item.sourceCitations.length > 0 ? `
        <div style="margin-top:32px;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <h4 style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569;">Sources</h4>
          <ol style="margin:0;padding-left:1.25em;font-size:13px;line-height:2;color:#334155;">
            ${item.sourceCitations.map((s) => `<li><a href="${s.url}" style="color:#2563eb;text-decoration:none;">${s.title}</a>${s.domain ? ` <span style="color:#94a3b8;">— ${s.domain}</span>` : ""}${s.publishedDate ? ` <span style="color:#94a3b8;">(${s.publishedDate})</span>` : ""}</li>`).join("\n            ")}
          </ol>
        </div>` : ""}
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
  ${schemaScripts}
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
