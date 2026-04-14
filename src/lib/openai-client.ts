import OpenAI from "openai";
import type { Response as OAIResponse } from "openai/resources/responses/responses";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the OpenAI API key — checks AppSetting DB first, falls back to env.
 * This ensures that when agency managers update their key in the Settings UI,
 * all endpoints immediately use the new key.
 */
export async function getOpenAiKey(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
  const key = setting?.value || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key not configured. Please add it in Settings.");
  return key;
}

/**
 * Create an OpenAI client using the standardised key resolution.
 */
export async function getOpenAiClient(): Promise<OpenAI> {
  const apiKey = await getOpenAiKey();
  return new OpenAI({ apiKey });
}

// ─── Web search helpers ──────────────────────────────────────────────────────

export interface WebSearchCitation {
  title: string;
  url: string;
}

/**
 * Extract URL citations from a Responses API result.
 */
export function extractCitations(response: OAIResponse): WebSearchCitation[] {
  const citations: WebSearchCitation[] = [];
  const seen = new Set<string>();
  for (const item of response.output) {
    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "output_text") {
          for (const ann of part.annotations) {
            if (ann.type === "url_citation" && !seen.has(ann.url)) {
              seen.add(ann.url);
              citations.push({ title: ann.title, url: ann.url });
            }
          }
        }
      }
    }
  }
  return citations;
}

export interface WebSearchResult {
  text: string;
  citations: WebSearchCitation[];
}

/**
 * Call the Responses API with web_search_preview enabled.
 * Use this on endpoints where real-time market / industry context adds value
 * (strategy-document, root-cause, overview-narrative).
 */
export async function createWithWebSearch(
  openai: OpenAI,
  opts: {
    model?: string;
    instructions: string;
    input: string;
    temperature?: number;
    maxOutputTokens?: number;
    textFormat?: { type: "text" } | { type: "json_object" };
    searchContextSize?: "low" | "medium" | "high";
    userLocation?: { type: "approximate"; country?: string; region?: string; city?: string };
  },
): Promise<WebSearchResult> {
  const webSearchTool: OpenAI.Responses.WebSearchTool = {
    type: "web_search_preview",
    search_context_size: opts.searchContextSize ?? "medium",
    ...(opts.userLocation ? { user_location: opts.userLocation } : {}),
  };

  const response = await openai.responses.create({
    model: opts.model ?? "gpt-5.4",
    instructions: opts.instructions,
    input: opts.input,
    tools: [webSearchTool],
    temperature: opts.temperature ?? 0.3,
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    ...(opts.textFormat ? { text: { format: opts.textFormat } } : {}),
  });

  return {
    text: response.output_text,
    citations: extractCitations(response),
  };
}

/**
 * Stream a Responses API call with web_search_preview enabled.
 * Returns a ReadableStream in SSE format matching existing streaming conventions.
 */
export function streamWithWebSearch(
  openai: OpenAI,
  opts: {
    model?: string;
    instructions: string;
    input: string;
    temperature?: number;
    maxOutputTokens?: number;
    searchContextSize?: "low" | "medium" | "high";
    userLocation?: { type: "approximate"; country?: string; region?: string; city?: string };
  },
): ReadableStream<Uint8Array> {
  const webSearchTool: OpenAI.Responses.WebSearchTool = {
    type: "web_search_preview",
    search_context_size: opts.searchContextSize ?? "medium",
    ...(opts.userLocation ? { user_location: opts.userLocation } : {}),
  };

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = openai.responses.stream({
          model: opts.model ?? "gpt-5.4",
          instructions: opts.instructions,
          input: opts.input,
          tools: [webSearchTool],
          temperature: opts.temperature ?? 0.3,
          ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
        });

        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: event.delta })}\n\n`));
          }
        }

        // Send citations after stream completes
        const finalResponse = await stream.finalResponse();
        const citations = extractCitations(finalResponse);
        if (citations.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`),
        );
        controller.close();
      }
    },
  });
}
