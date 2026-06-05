import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logAICost } from "@/lib/ai-cost-logger";
import { getAnthropicClient } from "@/lib/anthropic-client";

/**
 * Resolve the OpenAI API key — checks AppSetting DB first, falls back to env.
 * This ensures that when agency managers update their key in the Settings UI,
 * all endpoints immediately use the new key.
 */
export async function getOpenAiKey(): Promise<string> {
  const anthropicSetting = await prisma.appSetting.findUnique({
    where: { key: "anthropicApiKey" },
  });
  const key = anthropicSetting?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("Anthropic API key not configured. Please add it in Settings.");
  }
  return key;
}

/**
 * Create an OpenAI-compatible client backed by Anthropic.
 * This preserves existing route code while ensuring Anthropic is the active provider.
 */
export async function getOpenAiClient(): Promise<OpenAI> {
  const anthropic = await getAnthropicClient();

  const chatCompletionsCreate = async (params: {
    model?: string;
    messages?: Array<{ role?: string; content?: unknown }>;
    temperature?: number;
    max_completion_tokens?: number;
    max_tokens?: number;
    response_format?: { type?: string };
    stream?: boolean;
  }) => {
    const model = mapModelToAnthropic(params.model);
    const { system, messages } = toAnthropicMessages(params.messages ?? []);
    const maxTokens = params.max_completion_tokens ?? params.max_tokens ?? 2500;

    if (params.stream) {
      return streamChatAsOpenAiShape(anthropic, {
        model,
        system,
        messages,
        temperature: params.temperature,
        maxTokens,
      });
    }

    const response = await anthropic.messages.create({
      model,
      system,
      messages,
      max_tokens: maxTokens,
      temperature: params.temperature,
    });

    const text = extractAnthropicText(response.content);
    const asJsonMode = params.response_format?.type === "json_object";

    return {
      id: response.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          finish_reason: response.stop_reason ?? "stop",
          message: {
            role: "assistant",
            content: asJsonMode ? coerceJsonObjectString(text) : text,
          },
        },
      ],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  };

  const responsesCreate = async (params: {
    model?: string;
    instructions?: string;
    input?: string;
    tools?: Array<{ type?: string }>;
    temperature?: number;
    max_output_tokens?: number;
  }) => {
    const model = mapModelToAnthropic(params.model);
    const useWebSearch = (params.tools ?? []).some((tool) => tool?.type === "web_search_preview");

    const response = await anthropic.messages.create({
      model,
      system: params.instructions,
      messages: [{ role: "user", content: params.input ?? "" }],
      max_tokens: params.max_output_tokens ?? 2500,
      temperature: params.temperature,
      ...(useWebSearch ? { tools: [{ type: "web_search_20250305", name: "web_search" }] } : {}),
    });

    const text = extractAnthropicText(response.content);
    const citations = extractAnthropicCitations(response.content);

    return {
      id: response.id,
      model,
      output_text: text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text,
              annotations: citations.map((citation) => ({
                type: "url_citation",
                title: citation.title,
                url: citation.url,
              })),
            },
          ],
        },
      ],
    };
  };

  return {
    chat: {
      completions: {
        create: chatCompletionsCreate,
      },
    },
    responses: {
      create: responsesCreate,
    },
  } as unknown as OpenAI;
}

/**
 * Wrapper to log OpenAI API usage after a chat completion is received.
 * Call this in route handlers after receiving a response from openai.chat.completions.create()
 */
export async function logOpenAiUsage(
  tool: string,
  response: {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
  },
): Promise<void> {
  try {
    if (!response.usage) {
      console.warn("[AI Cost Logger] No usage data in response");
      return;
    }

    const inputTokens = response.usage.input_tokens ?? response.usage.prompt_tokens ?? 0;
    const outputTokens = response.usage.output_tokens ?? response.usage.completion_tokens ?? 0;

    await logAICost({
      tool,
      provider: "anthropic",
      model: mapModelToAnthropic(response.model),
      inputTokens,
      outputTokens,
    });
  } catch (error) {
    console.error("[AI Cost Logger] Failed to log usage:", error);
  }
}

/**
 * Wrapper to log OpenAI Responses API usage (web search, tool calls, etc.).
 * Call this after `openai.responses.create(...)`. Tolerates missing usage data.
 * `web_search_preview` calls bill tokens against the underlying model, so this
 * captures spend that `logOpenAiUsage` (chat completions only) would otherwise miss.
 */
export async function logResponsesUsage(
  tool: string,
  response: { model?: string; usage?: { input_tokens?: number; output_tokens?: number } | null },
): Promise<void> {
  try {
    if (!response.usage) {
      console.warn("[OpenAI Cost Logger] No usage data in Responses result");
      return;
    }

    await logAICost({
      tool,
      provider: "anthropic",
      model: mapModelToAnthropic(response.model),
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
    });
  } catch (error) {
    console.error("[AI Cost Logger] Failed to log Responses usage:", error);
  }
}

// ─── Web search helpers ──────────────────────────────────────────────────────

export interface WebSearchCitation {
  title: string;
  url: string;
}

/**
 * Extract URL citations from a Responses API result.
 */
export function extractCitations(response: {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      annotations?: Array<{ type?: string; title?: string; url?: string }>;
    }>;
  }>;
}): WebSearchCitation[] {
  const citations: WebSearchCitation[] = [];
  const seen = new Set<string>();
  for (const item of response.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.type === "output_text" && Array.isArray(part.annotations)) {
          for (const ann of part.annotations) {
            if (ann.type === "url_citation" && ann.url && !seen.has(ann.url)) {
              seen.add(ann.url);
              citations.push({ title: ann.title ?? ann.url, url: ann.url });
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
  _openai: OpenAI,
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
  const anthropic = await getAnthropicClient();

  const response = await anthropic.messages.create({
    model: mapModelToAnthropic(opts.model),
    system: opts.instructions,
    messages: [{ role: "user", content: opts.input }],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxOutputTokens ?? 2500,
  });

  const citations = extractAnthropicCitations(response.content);
  const text = extractAnthropicText(response.content);

  return {
    text: opts.textFormat?.type === "json_object" ? coerceJsonObjectString(text) : text,
    citations,
  };
}

/**
 * Stream a Responses API call with web_search_preview enabled.
 * Returns a ReadableStream in SSE format matching existing streaming conventions.
 */
export function streamWithWebSearch(
  _openai: OpenAI,
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
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const anthropic = await getAnthropicClient();
        const stream = anthropic.messages.stream({
          model: mapModelToAnthropic(opts.model),
          system: opts.instructions,
          messages: [{ role: "user", content: opts.input }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxOutputTokens ?? 2500,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta" &&
            typeof event.delta.text === "string"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`),
            );
          }
        }

        const finalResponse = await stream.finalMessage();
        const citations = extractAnthropicCitations(finalResponse.content);
        if (citations.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });
}

function mapModelToAnthropic(model?: string): string {
  const candidate = (model || "claude-sonnet-4-6").toLowerCase();

  if (candidate.startsWith("claude-")) {
    if (candidate === "claude-opus-4-7") return "claude-opus-4-8";
    return candidate;
  }

  if (candidate.includes("gpt-5") || candidate.includes("gpt-4")) {
    // Route GPT-era model identifiers to a safe Anthropic default.
    return "claude-sonnet-4-6";
  }

  return "claude-sonnet-4-6";
}

function toAnthropicMessages(openAiMessages: Array<{ role?: string; content?: unknown }>): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of openAiMessages) {
    const role = msg.role ?? "user";
    const text = normalizeContent(msg.content);
    if (!text) continue;

    if (role === "system") {
      systemParts.push(text);
      continue;
    }

    messages.push({ role: role === "assistant" ? "assistant" : "user", content: text });
  }

  if (messages.length === 0) {
    messages.push({ role: "user", content: "Please continue." });
  }

  return {
    system: systemParts.join("\n\n"),
    messages,
  };
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") return record.text;
      if (typeof record.text === "string") return record.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractAnthropicText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      const record = block as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string" ? record.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractAnthropicCitations(content: unknown): WebSearchCitation[] {
  if (!Array.isArray(content)) return [];

  const seen = new Set<string>();
  const citations: WebSearchCitation[] = [];

  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    const blockCitations = Array.isArray(record.citations) ? record.citations : [];

    for (const rawCitation of blockCitations) {
      if (!rawCitation || typeof rawCitation !== "object") continue;
      const citation = rawCitation as Record<string, unknown>;
      const url =
        (typeof citation.url === "string" && citation.url) ||
        (typeof citation.uri === "string" && citation.uri) ||
        "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      citations.push({
        title: (typeof citation.title === "string" && citation.title) || url,
        url,
      });
    }
  }

  return citations;
}

function coerceJsonObjectString(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "{}";
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch {
    // Fall through to wrapped fallback.
  }
  return JSON.stringify({ result: trimmed });
}

function streamChatAsOpenAiShape(
  anthropic: Anthropic,
  opts: {
    model: string;
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens: number;
  },
): AsyncIterable<{
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{ index: number; delta: { content?: string }; finish_reason: string | null }>;
}> {
  const stream = anthropic.messages.stream({
    model: opts.model,
    system: opts.system,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  });

  const id = `chatcmpl_${Date.now().toString(36)}`;
  const created = Math.floor(Date.now() / 1000);

  async function* iterator() {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        typeof event.delta.text === "string"
      ) {
        yield {
          id,
          object: "chat.completion.chunk" as const,
          created,
          model: opts.model,
          choices: [
            {
              index: 0,
              delta: { content: event.delta.text },
              finish_reason: null,
            },
          ],
        };
      }
    }

    yield {
      id,
      object: "chat.completion.chunk" as const,
      created,
      model: opts.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    };
  }

  return {
    [Symbol.asyncIterator]: iterator,
  };
}
