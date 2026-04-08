import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

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
