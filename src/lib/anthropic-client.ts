import Anthropic from "@anthropic-ai/sdk";
import type Anthropic_ from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logAICost } from "@/lib/ai-cost-logger";

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
  return new Anthropic({ apiKey });
}

/**
 * Wrapper to log Anthropic API usage after a message is created.
 * Call this in route handlers after receiving a response from anthropic.messages.create()
 */
export async function logAnthropicUsage(
  tool: string,
  message: Anthropic_.Messages.Message
): Promise<void> {
  try {
    // Extract model name — remove provider prefix if present
    const modelName = message.model.replace("claude-", "claude-");

    await logAICost({
      tool,
      provider: "anthropic",
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
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
  params: any
): Promise<Anthropic_.Messages.Message> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (client.messages.stream as any)(params);
  return await stream.finalMessage();
}
