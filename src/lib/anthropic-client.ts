import Anthropic from "@anthropic-ai/sdk";
import type Anthropic_ from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getModelPricing, logAICost } from "@/lib/ai-cost-logger";

const PROMPT_CACHE_CONTROL = { type: "ephemeral" } as const;

function hasCacheControl(value: unknown): boolean {
  return (
    !!value && typeof value === "object" && "cache_control" in (value as Record<string, unknown>)
  );
}

function hasBlockLevelCacheControl(request: Record<string, unknown>): boolean {
  const system = Array.isArray(request.system) ? request.system : [];
  const tools = Array.isArray(request.tools) ? request.tools : [];
  const messages = Array.isArray(request.messages) ? request.messages : [];

  const systemHasCache = system.some((block) => hasCacheControl(block));
  const toolsHaveCache = tools.some((tool) => hasCacheControl(tool));
  const messagesHaveCache = messages.some((message) => {
    if (!message || typeof message !== "object") return false;
    const content = (message as { content?: unknown }).content;
    if (!Array.isArray(content)) return false;
    return content.some((block) => hasCacheControl(block));
  });

  return systemHasCache || toolsHaveCache || messagesHaveCache;
}

function addSystemCacheBreakpoint(system: unknown): unknown {
  if (typeof system === "string") {
    if (!system.trim()) return system;
    return [
      {
        type: "text",
        text: system,
        cache_control: PROMPT_CACHE_CONTROL,
      },
    ];
  }

  if (!Array.isArray(system)) return system;

  const nextSystem = [...system];
  for (let i = nextSystem.length - 1; i >= 0; i -= 1) {
    const block = nextSystem[i];

    if (typeof block === "string") {
      if (!block.trim()) continue;
      nextSystem[i] = {
        type: "text",
        text: block,
        cache_control: PROMPT_CACHE_CONTROL,
      };
      return nextSystem;
    }

    if (!block || typeof block !== "object" || hasCacheControl(block)) continue;

    const candidate = block as { type?: unknown; text?: unknown } & Record<string, unknown>;
    if (candidate.type === "text" && typeof candidate.text === "string" && candidate.text.trim()) {
      nextSystem[i] = {
        ...candidate,
        cache_control: PROMPT_CACHE_CONTROL,
      };
      return nextSystem;
    }
  }

  return system;
}

function withAnthropicPromptCaching(params: unknown): unknown {
  if (process.env.ANTHROPIC_PROMPT_CACHING_DISABLED === "true") return params;
  if (!params || typeof params !== "object") return params;

  const request = params as Record<string, unknown>;

  // Keep existing request-level or block-level cache controls untouched.
  if (hasCacheControl(request) || hasBlockLevelCacheControl(request)) {
    return params;
  }

  const messages = Array.isArray(request.messages) ? request.messages : [];
  if (messages.length > 1) {
    // Multi-turn conversations benefit from Anthropic automatic caching.
    return {
      ...request,
      cache_control: PROMPT_CACHE_CONTROL,
    };
  }

  // One-shot requests are safer with an explicit breakpoint on the system prompt.
  const systemWithCache = addSystemCacheBreakpoint(request.system);
  if (systemWithCache !== request.system) {
    return {
      ...request,
      system: systemWithCache,
    };
  }

  return params;
}

function enableAnthropicPromptCaching(client: Anthropic): Anthropic {
  const messagesApi = client.messages as unknown as {
    create?: (...args: unknown[]) => unknown;
    stream?: (...args: unknown[]) => unknown;
  };

  const originalCreate =
    typeof messagesApi.create === "function" ? messagesApi.create.bind(messagesApi) : null;
  if (originalCreate) {
    messagesApi.create = (params: unknown, ...rest: unknown[]) => {
      return originalCreate(withAnthropicPromptCaching(params), ...rest);
    };
  }

  const originalStream =
    typeof messagesApi.stream === "function" ? messagesApi.stream.bind(messagesApi) : null;
  if (originalStream) {
    messagesApi.stream = (params: unknown, ...rest: unknown[]) => {
      return originalStream(withAnthropicPromptCaching(params), ...rest);
    };
  }

  return client;
}

/**
 * Resolve the Anthropic API key — checks AppSetting DB first, falls back to env.
 */
export async function getAnthropicKey(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "anthropicApiKey" } });
  const key = setting?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured. Please add it in Settings.");
  return key;
}

/**
 * Create an Anthropic client using the standardised key resolution.
 */
export async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = await getAnthropicKey();
  const client = new Anthropic({ apiKey });
  return enableAnthropicPromptCaching(client);
}

/**
 * Wrapper to log Anthropic API usage after a message is created.
 * Call this in route handlers after receiving a response from anthropic.messages.create()
 */
export async function logAnthropicUsage(
  tool: string,
  message: Anthropic_.Messages.Message,
): Promise<void> {
  try {
    const usage = message.usage as Anthropic_.Messages.Message["usage"] & {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
      };
    };
    const uncachedInputTokens = usage.input_tokens;
    const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
    const cacheCreation1hInputTokens = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const cacheCreation5mInputTokens =
      usage.cache_creation?.ephemeral_5m_input_tokens ??
      Math.max(cacheCreationInputTokens - cacheCreation1hInputTokens, 0);
    const totalInputTokens =
      uncachedInputTokens +
      cacheCreation5mInputTokens +
      cacheCreation1hInputTokens +
      cacheReadInputTokens;

    // Anthropic prompt caching has different multipliers for cache reads/writes.
    // Compute a precise override so dashboard costs track billed amounts.
    const pricing = getModelPricing(message.model);
    const costUSD = pricing
      ? Number(
          (
            (uncachedInputTokens / 1000) * pricing.input +
            (cacheReadInputTokens / 1000) * pricing.input * 0.1 +
            (cacheCreation5mInputTokens / 1000) * pricing.input * 1.25 +
            (cacheCreation1hInputTokens / 1000) * pricing.input * 2 +
            (usage.output_tokens / 1000) * pricing.output
          ).toFixed(6),
        )
      : undefined;

    await logAICost({
      tool,
      provider: "anthropic",
      model: message.model,
      inputTokens: totalInputTokens,
      outputTokens: usage.output_tokens,
      costUSD,
    });
  } catch (error) {
    console.error("[Anthropic Cost Logger] Failed to log usage:", error);
  }
}

/**
 * Run a long Anthropic message via the streaming API and return the final
 * message. The SDK requires streaming for any request that could exceed the
 * 10-minute non-streaming timeout, which is hit when extended thinking is
 * enabled with a generous budget.
 */
export async function createLongMessage(
  client: Anthropic,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): Promise<Anthropic_.Messages.Message> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (client.messages.stream as any)(withAnthropicPromptCaching(params));
  return await stream.finalMessage();
}
