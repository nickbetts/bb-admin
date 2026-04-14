import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── OpenAI usage types ────────────────────────────────────────────────────────

interface OpenAiUsageBucket {
  object: string;
  start_time: number;
  end_time: number;
  results: Array<{
    input_tokens: number;
    output_tokens: number;
    input_cached_tokens?: number;
    output_reasoning_tokens?: number;
    num_model_requests: number;
    model_ids?: string[];
    project_id?: string | null;
  }>;
}

interface OpenAiUsageResponse {
  object: string;
  data: OpenAiUsageBucket[];
  has_more: boolean;
  next_page?: string;
}

// Pricing per 1K tokens (USD) — approximate list prices; verify at platform.openai.com/pricing
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5.4":              { input: 0.0025,   output: 0.015 },
  "gpt-5.4-mini":         { input: 0.00075,  output: 0.0045 },
  "gpt-5.4-nano":         { input: 0.0002,   output: 0.00125 },
  "gpt-4o":               { input: 0.005,    output: 0.015 },
  "gpt-4o-mini":          { input: 0.00015,  output: 0.0006 },
  "gpt-4-turbo":          { input: 0.01,     output: 0.03 },
  "gpt-4":                { input: 0.03,     output: 0.06 },
  "gpt-3.5-turbo":        { input: 0.0005,   output: 0.0015 },
  "o1":                   { input: 0.015,    output: 0.06 },
  "o1-mini":              { input: 0.003,    output: 0.012 },
  "o3-mini":              { input: 0.0011,   output: 0.0044 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const entry = Object.entries(OPENAI_PRICING).find(([key]) => model.startsWith(key));
  if (!entry) return 0;
  const [, prices] = entry;
  return (inputTokens / 1000) * prices.input + (outputTokens / 1000) * prices.output;
}

async function fetchOpenAiUsage(apiKey: string): Promise<{
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  estimatedCostUsd: number;
  byModel: Array<{ model: string; inputTokens: number; outputTokens: number; requests: number; estimatedCostUsd: number }>;
  periodDays: number;
} | null> {
  try {
    // Fetch last 30 days of usage using the completions usage endpoint
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 30 * 86400;

    const url = new URL("https://api.openai.com/v1/organization/usage/completions");
    url.searchParams.set("start_time", String(startTime));
    url.searchParams.set("end_time", String(endTime));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("group_by", "model");
    url.searchParams.set("page_size", "31");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const data = await res.json() as OpenAiUsageResponse;

    // Aggregate across all buckets grouped by model
    const modelMap = new Map<string, { inputTokens: number; outputTokens: number; requests: number }>();

    for (const bucket of data.data) {
      for (const result of bucket.results) {
        const models = result.model_ids && result.model_ids.length > 0 ? result.model_ids : ["unknown"];
        for (const model of models) {
          const existing = modelMap.get(model) ?? { inputTokens: 0, outputTokens: 0, requests: 0 };
          existing.inputTokens += result.input_tokens;
          existing.outputTokens += result.output_tokens;
          existing.requests += result.num_model_requests;
          modelMap.set(model, existing);
        }
      }
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalRequests = 0;
    let estimatedCostUsd = 0;
    const byModel: Array<{ model: string; inputTokens: number; outputTokens: number; requests: number; estimatedCostUsd: number }> = [];

    for (const [model, stats] of modelMap.entries()) {
      const cost = estimateCost(model, stats.inputTokens, stats.outputTokens);
      byModel.push({ model, ...stats, estimatedCostUsd: cost });
      totalInputTokens += stats.inputTokens;
      totalOutputTokens += stats.outputTokens;
      totalRequests += stats.requests;
      estimatedCostUsd += cost;
    }

    // Sort by cost descending
    byModel.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

    return { totalInputTokens, totalOutputTokens, totalRequests, estimatedCostUsd, byModel, periodDays: 30 };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Env-var presence checks (server-side only — never expose the values)
  const env = {
    semrush:      Boolean(process.env.SEMRUSH_API_KEY),
    meta:         Boolean(process.env.META_ACCESS_TOKEN),
    googleOAuth:  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoftAds: Boolean(
      process.env.MICROSOFT_ADS_REFRESH_TOKEN &&
      process.env.MICROSOFT_ADS_CLIENT_ID &&
      process.env.MICROSOFT_ADS_CLIENT_SECRET
    ),
  };

  // DB queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [clients, connections, openAiSetting, lastFiveCronRuns] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        searchConsoleSiteUrl: true,
        semrushDomain: true,
        tiktokAdvertiserId: true,
        microsoftAdsAccountId: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
        cwvUrl: true,
      },
    }),
    prisma.googleConnection.findMany({ select: { id: true, email: true, label: true } }),
    prisma.appSetting.findUnique({ where: { key: "openaiApiKey" }, select: { value: true } }),
    (db.cronLog.findMany({
      where: { jobName: "snapshots" },
      orderBy: { startedAt: "desc" },
      take: 5,
    }) as Promise<Array<{
      id: string; status: string; startedAt: Date; completedAt: Date | null;
      snapshotsNew: number; snapshotsSkipped: number; errors: number; details: string | null;
    }>>).catch(() => []),
  ]);

  // Per-platform client configuration counts
  const platformCounts = {
    ga4:          clients.filter((c) => c.ga4PropertyId).length,
    googleads:    clients.filter((c) => c.googleAdsCustomerId).length,
    meta:         clients.filter((c) => c.metaAccountId).length,
    searchconsole:clients.filter((c) => c.searchConsoleSiteUrl).length,
    seo:          clients.filter((c) => c.semrushDomain).length,
    tiktok:       clients.filter((c) => c.tiktokAdvertiserId).length,
    microsoftads: clients.filter((c) => c.microsoftAdsAccountId).length,
    woocommerce:  clients.filter((c) => c.woocommerceUrl).length,
    shopify:      clients.filter((c) => c.shopifyStoreDomain).length,
    cwv:          clients.filter((c) => c.cwvUrl).length,
  };

  // SEMrush live units balance + usage history tracking
  let semrushUnits: number | null = null;
  let semrushHistory: Array<{ date: string; balance: number }> = [];

  if (env.semrush) {
    // Load existing balance history from AppSetting
    try {
      const historySetting = await prisma.appSetting.findUnique({ where: { key: "semrushBalanceHistory" } });
      if (historySetting?.value) {
        semrushHistory = JSON.parse(historySetting.value) as Array<{ date: string; balance: number }>;
      }
    } catch { /* non-fatal */ }

    // Fetch current balance from SEMrush API
    try {
      const r = await fetch(
        `https://api.semrush.com/?type=units_budget_info&key=${process.env.SEMRUSH_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const text = await r.text();
      // Response: "BUDGET::12345" or error string
      const match = text.match(/BUDGET::(\d+)/);
      if (match) semrushUnits = parseInt(match[1]);
    } catch { /* non-fatal */ }

    // Store today's balance snapshot (one per day, max 90 entries)
    if (semrushUnits !== null) {
      const today = new Date().toISOString().split("T")[0];
      // Remove any existing entry for today then add the fresh reading
      semrushHistory = semrushHistory.filter((e) => e.date !== today);
      semrushHistory.push({ date: today, balance: semrushUnits });
      // Keep only the most recent 90 days, sorted oldest first
      semrushHistory = semrushHistory
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);
      // Persist back to AppSetting (fire-and-forget)
      prisma.appSetting.upsert({
        where: { key: "semrushBalanceHistory" },
        create: { key: "semrushBalanceHistory", value: JSON.stringify(semrushHistory) },
        update: { value: JSON.stringify(semrushHistory) },
      }).catch(() => { /* non-fatal */ });
    }
  }

  // OpenAI configured status (DB key overrides env)
  const openAiApiKey = openAiSetting?.value || process.env.OPENAI_API_KEY || null;
  const openAiConfigured = Boolean(openAiApiKey);

  // Fetch live OpenAI usage for last 30 days (non-fatal — requires usage.read scope)
  let openAiUsage: Awaited<ReturnType<typeof fetchOpenAiUsage>> = null;
  if (openAiApiKey) {
    openAiUsage = await fetchOpenAiUsage(openAiApiKey);
  }

  // Per-platform error breakdown from last 5 cron runs
  const platformErrors: Record<string, number> = {};
  for (const run of lastFiveCronRuns) {
    if (!run.details) continue;
    try {
      const details = JSON.parse(run.details) as Array<{ errors?: string[] }>;
      for (const client of details) {
        for (const errMsg of (client.errors ?? [])) {
          const key = errMsg.split(":")[0].trim().toLowerCase().replace(/\s+/g, "");
          platformErrors[key] = (platformErrors[key] ?? 0) + 1;
        }
      }
    } catch { /* skip malformed */ }
  }

  // Aggregate cron stats across last 5 runs
  const cronStats = {
    runs: lastFiveCronRuns.length,
    totalNew: lastFiveCronRuns.reduce((s, r) => s + r.snapshotsNew, 0),
    totalSkipped: lastFiveCronRuns.reduce((s, r) => s + r.snapshotsSkipped, 0),
    totalErrors: lastFiveCronRuns.reduce((s, r) => s + r.errors, 0),
    lastRunAt: lastFiveCronRuns[0]?.completedAt?.toISOString() ?? null,
    lastRunStatus: lastFiveCronRuns[0]?.status ?? null,
  };

  return NextResponse.json({
    env,
    platformCounts,
    totalClients: clients.length,
    googleConnections: { count: connections.length, accounts: connections.map((c) => ({ email: c.email, label: c.label })) },
    semrush: { configured: env.semrush, units: semrushUnits, history: semrushHistory },
    openai: { configured: openAiConfigured, usage: openAiUsage },
    platformErrors,
    cronStats,
  });
}
