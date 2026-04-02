import OpenAI from "openai";
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
