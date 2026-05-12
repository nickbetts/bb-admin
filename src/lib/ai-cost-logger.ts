import { prisma } from "@/lib/prisma";

/**
 * Model pricing (USD per 1K tokens) — update as pricing changes
 * Last updated: May 2026
 */
const PRICING = {
  // Anthropic
  "claude-opus-4-5": { input: 0.015, output: 0.075 },
  "claude-sonnet-4-5": { input: 0.003, output: 0.015 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },

  // OpenAI
  "gpt-4o": { input: 0.00525, output: 0.021 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
} as const;

type ModelKey = keyof typeof PRICING;

export interface AICostLogInput {
  tool: string; // e.g. "content-strategy", "summary", "grand-plan"
  provider: "anthropic" | "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Calculate cost in USD for a given model and token counts
 */
export function calculateCostUSD(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model as ModelKey];
  if (!pricing) {
    console.warn(`Unknown model for pricing: ${model}`);
    return 0;
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Log an AI cost entry to the database
 */
export async function logAICost(input: AICostLogInput): Promise<void> {
  try {
    const costUSD = calculateCostUSD(input.model, input.inputTokens, input.outputTokens);

    await prisma.aICostLog.create({
      data: {
        tool: input.tool,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUSD,
      },
    });
  } catch (error) {
    // Don't fail the API request if logging fails
    console.error("[AI Cost Logger] Failed to log cost:", error);
  }
}

/**
 * Get cost breakdown aggregated by tool for a date range
 */
export async function getCostsByTool(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  tool: string;
  provider: "anthropic" | "openai";
  totalCost: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}>> {
  const logs = await prisma.aICostLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const breakdown = new Map<
    string,
    {
      tool: string;
      provider: "anthropic" | "openai";
      totalCost: number;
      callCount: number;
      inputTokens: number;
      outputTokens: number;
    }
  >();

  for (const log of logs) {
    const key = `${log.tool}:${log.provider}`;
    const provider = log.provider as "anthropic" | "openai";
    const existing = breakdown.get(key) || {
      tool: log.tool,
      provider,
      totalCost: 0,
      callCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    };

    existing.totalCost += log.costUSD;
    existing.callCount += 1;
    existing.inputTokens += log.inputTokens;
    existing.outputTokens += log.outputTokens;

    breakdown.set(key, existing);
  }

  return Array.from(breakdown.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );
}

/**
 * Get cost breakdown aggregated by provider
 */
export async function getCostsByProvider(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  provider: "anthropic" | "openai";
  totalCost: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}>> {
  const logs = await prisma.aICostLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const breakdown = new Map<
    "anthropic" | "openai",
    {
      provider: "anthropic" | "openai";
      totalCost: number;
      callCount: number;
      inputTokens: number;
      outputTokens: number;
    }
  >();

  for (const log of logs) {
    const provider = log.provider as "anthropic" | "openai";
    const existing = breakdown.get(provider) || {
      provider,
      totalCost: 0,
      callCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    };

    existing.totalCost += log.costUSD;
    existing.callCount += 1;
    existing.inputTokens += log.inputTokens;
    existing.outputTokens += log.outputTokens;

    breakdown.set(provider, existing);
  }

  return Array.from(breakdown.values());
}

/**
 * Get total costs across all providers for a date range
 */
export async function getTotalCost(
  startDate: Date,
  endDate: Date
): Promise<{ totalCost: number; callCount: number; inputTokens: number; outputTokens: number }> {
  const result = await prisma.aICostLog.aggregate({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      costUSD: true,
      inputTokens: true,
      outputTokens: true,
    },
    _count: true,
  });

  return {
    totalCost: result._sum.costUSD ?? 0,
    callCount: result._count,
    inputTokens: result._sum.inputTokens ?? 0,
    outputTokens: result._sum.outputTokens ?? 0,
  };
}
